"use client";

import * as React from "react";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Users,
  HardHat,
  ListChecks,
  Cake,
  UsersRound,
  BrainCircuit,
  BriefcaseBusiness,
  Boxes
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Inicio' },
  { href: '/employees', icon: Users, label: 'Dotación de Personal' },
  { href: '/ingreso-funcionarios', icon: HardHat, label: 'Ingreso de personal' },
  { href: '/tasks', icon: ListChecks, label: 'Tareas' },
  { href: '/inventory', icon: Boxes, label: 'Inventario' },
  { href: '/birthdays', icon: Cake, label: 'Cumpleaños' },
  { href: '/replacements', icon: UsersRound, label: 'Reemplazo' },
  { href: '/intelligent-assignment', icon: BrainCircuit, label: 'Asignación Inteligente' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar className="border-r-0 bg-primary">
        <SidebarHeader className="p-6">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
                <BriefcaseBusiness className="size-6 text-white" />
            </div>
            <h1 className="font-headline text-xl font-bold text-white group-data-[collapsible=icon]:hidden uppercase tracking-widest">
              PERSONAL
            </h1>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-2">
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(item.href)}
                  tooltip={item.label}
                  className="text-white hover:bg-white/10 data-[active=true]:bg-secondary data-[active=true]:text-white data-[active=true]:shadow-lg transition-all duration-200 py-6"
                >
                  <Link href={item.href}>
                    <item.icon className="size-5 shrink-0" />
                    <span className="font-medium text-base">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3 p-2">
              <Avatar className="size-9 border-2 border-white/20">
                <AvatarImage src="https://avatar.vercel.sh/admin.png" alt="Admin" />
                <AvatarFallback className="bg-secondary text-white">A</AvatarFallback>
              </Avatar>
              <div className="flex flex-col group-data-[collapsible=icon]:hidden overflow-hidden text-white">
                <span className="text-sm font-bold truncate">Usuario Admin</span>
                <span className="text-xs opacity-60 truncate">hcurepto@gmail.com</span>
              </div>
            </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="p-4 border-b h-16 flex items-center bg-white sticky top-0 z-30 justify-between">
            <div className="flex items-center gap-4">
                <SidebarTrigger className="text-primary hover:bg-primary/10" />
                <div className="h-6 w-px bg-border hidden sm:block" />
                <span className="text-sm font-medium text-muted-foreground hidden sm:block">Hospital de Curepto</span>
            </div>
        </header>
        <div className="flex-1 bg-slate-50/50">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
