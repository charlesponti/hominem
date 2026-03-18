import type { Meta, StoryObj } from '@storybook/react';
import { Home, Settings, Users } from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from './sidebar';

const meta: Meta<typeof Sidebar> = {
  title: 'Navigation/Sidebar',
  component: Sidebar,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Sidebar>;

const menuItems = [
  { title: 'Home', icon: Home },
  { title: 'Team', icon: Users },
  { title: 'Settings', icon: Settings },
];

export const Default: Story = {
  render: () => (
    <SidebarProvider style={{ '--sidebar-width': '16rem' } as React.CSSProperties}>
      <Sidebar>
        <SidebarHeader>
          <div className="px-2 py-2 font-semibold text-sm">Acme Inc</div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Application</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton>
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="px-2 py-2 text-xs text-muted-foreground">v1.0.0</div>
        </SidebarFooter>
      </Sidebar>
    </SidebarProvider>
  ),
};
