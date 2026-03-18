import type { Meta, StoryObj } from '@storybook/react';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from './navigation-menu';

const meta: Meta<typeof NavigationMenu> = {
  title: 'Navigation/NavigationMenu',
  component: NavigationMenu,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof NavigationMenu>;

export const Default: Story = {
  render: () => (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid gap-3 p-4 md:w-[400px]">
              <li>
                <NavigationMenuLink className="block p-3 rounded-md hover:bg-accent" href="#">
                  <div className="text-sm font-medium leading-none">Introduction</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Re-usable components built using Radix UI and Tailwind CSS.
                  </p>
                </NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink className="block p-3 rounded-md hover:bg-accent" href="#">
                  <div className="text-sm font-medium leading-none">Installation</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    How to install dependencies and structure your app.
                  </p>
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink className={navigationMenuTriggerStyle()} href="#">
            Documentation
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),
};
