import { Outlet } from 'react-router';

export default function BudgetLayout() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <main className="flex-1 relative overflow-y-auto focus:outline-none">
        <div className="py-6 px-4 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
