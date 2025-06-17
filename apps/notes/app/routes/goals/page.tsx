// Placeholder for GoalCard and GoalForm components
// import GoalCard from '../../components/goals/GoalCard';
// import GoalForm from '../../components/goals/GoalForm';

// Placeholder for fetching goals data
// For now, using a mock array
const mockGoals = [
  {
    id: '1',
    title: 'Learn TypeScript',
    description: 'Complete a TS course by end of month.',
    goalCategory: 'Learning',
    status: 'In Progress',
    priority: 1,
    milestones: [{ description: 'Finish 5 modules', completed: false }],
  },
  {
    id: '2',
    title: 'Run a 5K',
    description: 'Train and complete a 5K race.',
    goalCategory: 'Fitness',
    status: 'To Do',
    priority: 2,
    milestones: [],
  },
]

export default function GoalsPage() {
  // Placeholder for state management (e.g., showing a form to add new goals)
  // const [showAddForm, setShowAddForm] = React.useState(false);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Goals</h1>
        {/* Placeholder for Add Goal Button */}
        {/* <Button onClick={() => setShowAddForm(true)}>Add New Goal</Button> */}
      </div>

      {/* Placeholder for Goal Form */}
      {/* {showAddForm && (
        <div className="mb-6">
          <GoalForm onSubmit={() => {}} onCancel={() => setShowAddForm(false)} />
        </div>
      )} */}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {mockGoals.map((goal) => (
          // Replace with actual GoalCard component later
          <div
            key={goal.id}
            className="p-4 border rounded-lg shadow-sm bg-card text-card-foreground"
          >
            <h2 className="text-xl font-semibold mb-2">{goal.title}</h2>
            <p className="text-sm text-muted-foreground mb-1">Category: {goal.goalCategory}</p>
            <p className="text-sm mb-3">{goal.description}</p>
            <p className="text-xs font-medium">Status: {goal.status}</p>
            {/* Add more goal details and actions here */}
          </div>
        ))}
      </div>

      {mockGoals.length === 0 && (
        <p className="text-center text-muted-foreground mt-10">
          You haven't set any goals yet. Click "Add New Goal" to get started!
        </p>
      )}
    </div>
  )
}
