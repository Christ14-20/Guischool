import { AppSidebar } from '@/components/layout/app-sidebar';
import { SchoolYearProvider } from '@/components/layout/school-year-provider';
import { TopBar } from '@/components/layout/top-bar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-transparent">
      <AppSidebar />
      <SchoolYearProvider>
        <div className="min-w-0 flex-1 pb-4">
          <TopBar />
          <main className="px-3 pt-4 md:px-5 md:pt-5">{children}</main>
        </div>
      </SchoolYearProvider>
    </div>
  );
}
