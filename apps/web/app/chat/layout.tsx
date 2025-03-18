export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-lvh max-h-lvh overflow-scroll flex flex-col justify-center p-4">
      {children}
    </div>
  )
}
