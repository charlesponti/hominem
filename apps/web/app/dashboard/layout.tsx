export default function DashboardLayout({
	children,
}: { children: React.ReactNode }) {
	return <div className="w-full h-full flex flex-col">{children}</div>;
}
