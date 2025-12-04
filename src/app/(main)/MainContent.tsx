'use client';

import { Menu, Bell, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSidebarContext } from "@/contexts/SidebarContext";
import { UserDropdown } from '@/components/UserDropdown';
import { User } from '@prisma/client';

interface MainContentProps {
    children: React.ReactNode;
    user: User | null;
}

export function MainContent({ children, user }: MainContentProps) {
    const {
        sidebarOpen,
        setSidebarOpen,
        sidebarCollapsed,
        toggleSidebar,
    } = useSidebarContext();

    return (
        <div className=
            "flex-1 flex flex-col overflow-hidden transition-all duration-300">
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between h-16 px-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleSidebar}
                            className="z-50 hidden lg:flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                        >
                            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            <Menu className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"><Calendar className="w-5 h-5" /></button>
                        <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 relative"><Bell className="w-5 h-5" /><span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" /></button>
                        <UserDropdown user={user} />
                    </div>
                </div>
            </header>
            <main className="flex-1 overflow-auto">
                <div className="p-6">{children}</div>
            </main>
        </div>
    );
}