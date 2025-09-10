import Lists from '~/components/lists/lists'

export default function Index() {
  return (
    <div className="flex flex-col gap-4 w-full h-full pb-8" data-testid="dashboard-scene">
      <Lists />
    </div>
  )
}
