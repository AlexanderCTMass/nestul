import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Admin Panel - Reestr-Zakupka',
    description: 'Administration panel for Registry management',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return children;
}