package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

const (
	defaultTraceDir = ".type-analysis"
	defaultProject  = "tsconfig.json"
	tscOutput       = "tsc-extended.log"
	trcJSON         = "tsc-trace.json"
	tsServerLog     = "tsserver.log"
	tsServerStdout  = "tsserver.stdout"
)

type event struct {
	Name string                 `json:"name"`
	Dur  float64                `json:"dur"`
	Args map[string]interface{} `json:"args"`
}

type summary struct {
	durations map[string]float64
	files     map[string]float64
}

type options struct {
	analyzePath     string
	project         string
	traceDir        string
	tsserverSeconds time.Duration
}

func newSummary() *summary {
	return &summary{
		durations: make(map[string]float64),
		files:     make(map[string]float64),
	}
}

func (s *summary) addEvent(e event) {
	if e.Dur <= 0 {
		return
	}
	name := e.Name
	if name == "" {
		name = "unknown"
	}
	s.durations[name] += e.Dur
	if file := extractFile(e.Args); file != "" {
		s.files[file] += e.Dur
	}
}

func (s *summary) load(path string) error {
	info, err := os.Stat(path)
	if err != nil {
		return err
	}

	if info.IsDir() {
		return filepath.Walk(path, func(p string, info os.FileInfo, err error) error {
			if err != nil || info.IsDir() || !strings.HasSuffix(info.Name(), ".json") {
				return err
			}
			return s.processFile(p)
		})
	}

	return s.processFile(path)
}

func (s *summary) processFile(path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()

	dec := json.NewDecoder(f)
	t, err := dec.Token()
	if err != nil {
		return err
	}
	if delim, ok := t.(json.Delim); !ok || delim != '[' {
		return fmt.Errorf("trace file %s is not an array", path)
	}

	for dec.More() {
		var e event
		if err := dec.Decode(&e); err != nil {
			return err
		}
		s.addEvent(e)
	}

	return nil
}

func main() {
	opts := parseOptions()

	if opts.analyzePath != "" {
		fmt.Printf("Analyzing existing trace data --> %s\n", opts.analyzePath)
		printTraceSummary(opts.analyzePath)
		return
	}

	if err := os.MkdirAll(opts.traceDir, 0o755); err != nil {
		fail(err)
	}

	fmt.Printf("1/3 Running `npx tsc` diagnostics + trace with %s...\n", opts.project)
	if err := runTSC(opts); err != nil {
		fail(err)
	}

	fmt.Printf("2/3 Capturing tsserver log (%ds)...\n", int(opts.tsserverSeconds/time.Second))
	if err := captureTSServer(opts); err != nil {
		fail(err)
	}

	traceFile := filepath.Join(opts.traceDir, trcJSON, "trace.json")
	if _, err := os.Stat(traceFile); os.IsNotExist(err) {
		traceFile = filepath.Join(opts.traceDir, trcJSON)
	}

	fmt.Println("3/3 Summaries:")
	fmt.Printf("  • Project: %s\n", opts.project)
	fmt.Printf("  • Diagnostics log: %s\n", filepath.Join(opts.traceDir, tscOutput))
	fmt.Printf("  • Trace data: %s\n", traceFile)
	fmt.Printf("  • tsserver log: %s\n", filepath.Join(opts.traceDir, tsServerLog))
	fmt.Printf("  • tsserver stdout: %s\n", filepath.Join(opts.traceDir, tsServerStdout))

	printTraceSummary(traceFile)
}

func printTraceSummary(path string) {
	s := newSummary()
	if err := s.load(path); err != nil {
		fmt.Fprintf(os.Stderr, "failed to analyze trace: %v\n", err)
		return
	}
	s.print()
}

func parseOptions() options {
	opts := options{
		project:         defaultProject,
		traceDir:        defaultTraceDir,
		tsserverSeconds: 30 * time.Second,
	}

	for i := 1; i < len(os.Args); i++ {
		arg := os.Args[i]
		switch {
		case arg == "--analyze" && i+1 < len(os.Args):
			opts.analyzePath = os.Args[i+1]
			i++
		case strings.HasPrefix(arg, "--analyze="):
			opts.analyzePath = strings.TrimPrefix(arg, "--analyze=")
		case arg == "--project" && i+1 < len(os.Args):
			opts.project = os.Args[i+1]
			i++
		case strings.HasPrefix(arg, "--project="):
			opts.project = strings.TrimPrefix(arg, "--project=")
		case arg == "--trace-dir" && i+1 < len(os.Args):
			opts.traceDir = os.Args[i+1]
			i++
		case strings.HasPrefix(arg, "--trace-dir="):
			opts.traceDir = strings.TrimPrefix(arg, "--trace-dir=")
		case arg == "--tsserver-seconds" && i+1 < len(os.Args):
			if secs, err := parsePositiveSeconds(os.Args[i+1]); err == nil {
				opts.tsserverSeconds = secs
			}
			i++
		case strings.HasPrefix(arg, "--tsserver-seconds="):
			raw := strings.TrimPrefix(arg, "--tsserver-seconds=")
			if secs, err := parsePositiveSeconds(raw); err == nil {
				opts.tsserverSeconds = secs
			}
		}
	}
	return opts
}

func parsePositiveSeconds(raw string) (time.Duration, error) {
	v := strings.TrimSpace(raw)
	seconds, err := time.ParseDuration(v + "s")
	if err != nil {
		return 0, err
	}
	if seconds <= 0 {
		return 0, fmt.Errorf("seconds must be positive")
	}
	return seconds, nil
}

func (s *summary) print() {
	if len(s.durations) == 0 {
		fmt.Println("no events found in trace data")
		return
	}
	printSection("Top event durations", s.durations, 20)
	if len(s.files) > 0 {
		printSection("Top files by aggregated duration", s.files, 20)
	}
}

func extractFile(args map[string]interface{}) string {
	if args == nil {
		return ""
	}
	for _, key := range []string{"path", "fileName", "containingFileName", "configFilePath"} {
		if v, ok := args[key]; ok {
			if s, ok := v.(string); ok {
				return strings.ToLower(s)
			}
		}
	}
	return ""
}

func printSection(title string, data map[string]float64, limit int) {
	type entry struct {
		name  string
		total float64
	}
	entries := make([]entry, 0, len(data))
	for name, total := range data {
		entries = append(entries, entry{name, total})
	}
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].total > entries[j].total
	})
	if len(entries) > limit {
		entries = entries[:limit]
	}
	fmt.Printf("\n=== %s (%d items) ===\n", title, len(entries))
	for _, e := range entries {
		fmt.Printf("%10.2f ms  %s\n", e.total, e.name)
	}
}

func runTSC(opts options) error {
	outPath := filepath.Join(opts.traceDir, tscOutput)
	jsonDir := filepath.Join(opts.traceDir, trcJSON)
	os.RemoveAll(jsonDir)
	os.Remove(outPath)
	if err := os.MkdirAll(jsonDir, 0o755); err != nil {
		return err
	}

	args := []string{
		"tsc",
		"--project", opts.project,
		"--extendedDiagnostics",
		"--traceResolution",
		"--generateTrace", filepath.Join(jsonDir, "trace.json"),
	}
	return runCommand("npx", args, outPath)
}

func captureTSServer(opts options) error {
	stdoutPath := filepath.Join(opts.traceDir, tsServerStdout)
	logPath := filepath.Join(opts.traceDir, tsServerLog)
	os.Remove(stdoutPath)
	os.Remove(logPath)

	args := []string{
		"tsserver",
		"--logVerbosity", "verbose",
		"--logFile", logPath,
		"--traceDirectory", filepath.Join(opts.traceDir, "tsserver-traces"),
	}
	return captureProcess("npx", args, stdoutPath, opts.tsserverSeconds)
}

func fail(err error) {
	fmt.Fprintf(os.Stderr, "error: %v\n", err)
	os.Exit(1)
}

func lookPath(name string) (string, error) {
	if strings.Contains(name, "/") {
		return name, nil
	}
	for _, dir := range strings.Split(os.Getenv("PATH"), ":") {
		candidate := filepath.Join(dir, name)
		if info, err := os.Stat(candidate); err == nil && !info.IsDir() {
			return candidate, nil
		}
	}
	return "", fmt.Errorf("executable %q not found in PATH", name)
}

func runCommand(name string, args []string, output string) error {
	path, err := lookPath(name)
	if err != nil {
		return err
	}
	file, err := os.Create(output)
	if err != nil {
		return err
	}
	defer file.Close()
	proc, err := os.StartProcess(path, append([]string{path}, args...), &os.ProcAttr{
		Dir:   "",
		Env:   os.Environ(),
		Files: []*os.File{os.Stdin, file, file},
	})
	if err != nil {
		return err
	}
	_, err = proc.Wait()
	return err
}

func captureProcess(name string, args []string, output string, duration time.Duration) error {
	path, err := lookPath(name)
	if err != nil {
		return err
	}
	file, err := os.Create(output)
	if err != nil {
		return err
	}
	defer file.Close()
	proc, err := os.StartProcess(path, append([]string{path}, args...), &os.ProcAttr{
		Dir:   "",
		Env:   os.Environ(),
		Files: []*os.File{os.Stdin, file, file},
	})
	if err != nil {
		return err
	}
	timer := time.NewTimer(duration)
	defer timer.Stop()
	done := make(chan error, 1)
	go func() {
		_, err := proc.Wait()
		done <- err
	}()
	select {
	case <-timer.C:
		_ = proc.Kill()
		<-done
	case err := <-done:
		return err
	}
	return nil
}
