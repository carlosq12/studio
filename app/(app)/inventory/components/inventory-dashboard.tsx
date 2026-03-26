'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
    HardDrive, 
    BarChart3, 
    PieChart, 
    Package,
    Monitor,
    Printer,
    Server,
    Laptop,
    Router,
    Tv,
    Box,
    ShoppingBag,
    CreditCard
} from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, query } from "firebase/firestore";
import type { InventarioEquipo } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";
import { 
    Bar, 
    BarChart, 
    ResponsiveContainer, 
    XAxis, 
    YAxis, 
    Tooltip,
    Cell,
    Pie,
    PieChart as RechartsPieChart,
    Legend
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

const COLORS = [
  '#ec4899', // Rosado Institucional (Total)
  '#3b82f6', // Azul (Minsal)
  '#8b5cf6', // Violeta (Arriendo Hosp)
  '#10b981', // Esmeralda (Compra Hosp)
  '#f59e0b', // Ámbar (Pendientes)
];

export function InventoryDashboard() {
  const firestore = useFirestore();
  const equiposQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'inventario_equipos')) : null, [firestore]);
  const { data: equipos, loading } = useCollection<InventarioEquipo>(equiposQuery);

  const stats = useMemo(() => {
    if (!equipos) return null;

    const total = equipos.length;
    
    const arriendoGroups: Record<string, number> = {
        'Arriendo Minsal': 0,
        'Arriendo Hospital': 0,
        'Compra Hospital': 0,
        'Sin Especificar': 0
    };

    const typeGroups: Record<string, number> = {};

    equipos.forEach(e => {
        const arriendo = e.tipo_arriendo || 'Sin Especificar';
        if (arriendoGroups[arriendo] !== undefined) {
            arriendoGroups[arriendo]++;
        } else {
            arriendoGroups['Sin Especificar']++;
        }

        const tipo = e['tipo de equipo'] || 'OTRO';
        typeGroups[tipo] = (typeGroups[tipo] || 0) + 1;
    });

    const arriendoChartData = Object.entries(arriendoGroups)
        .filter(([_, value]) => value > 0)
        .map(([name, value]) => ({ name, value }));

    const typeChartData = Object.entries(typeGroups)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total);

    return { total, arriendoGroups, arriendoChartData, typeChartData };
  }, [equipos]);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="h-32 animate-pulse bg-white border-none shadow-sm" />
        ))}
        <Card className="md:col-span-3 h-80 animate-pulse bg-white border-none shadow-sm" />
        <Card className="md:col-span-2 h-80 animate-pulse bg-white border-none shadow-sm" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Resumen Superior - Desglosado */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-none shadow-sm bg-gradient-to-br from-pink-500 to-pink-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[10px] font-bold uppercase tracking-wider opacity-90">Total General</CardTitle>
            <Box className="h-4 w-4 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{stats.total}</div>
            <p className="text-[10px] opacity-80 mt-1">Equipos en sistema</p>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm bg-white border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Minsal</CardTitle>
            <HardDrive className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-800">{stats.arriendoGroups['Arriendo Minsal']}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Arriendo Central</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white border-l-4 border-l-violet-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">Arriendo Hosp.</CardTitle>
            <CreditCard className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-800">{stats.arriendoGroups['Arriendo Hospital']}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Gestión Local</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Compra Hosp.</CardTitle>
            <ShoppingBag className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-800">{stats.arriendoGroups['Compra Hospital']}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Patrimonio Local</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Pendientes</CardTitle>
            <Package className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-800">{stats.arriendoGroups['Sin Especificar']}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Sin clasificar</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Gráfico de Arriendo */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50">
            <CardTitle className="flex items-center gap-2 text-lg font-headline text-slate-800">
                <PieChart className="h-5 w-5 text-pink-500"/>
                Distribución de Origen
            </CardTitle>
            <CardDescription>Modalidad de adquisición de los equipos.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] pt-6">
            <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                    <Pie
                        data={stats.arriendoChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                    >
                        {stats.arriendoChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Tipos */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50">
            <CardTitle className="flex items-center gap-2 text-lg font-headline text-slate-800">
                <BarChart3 className="h-5 w-5 text-blue-500"/>
                Categorías de Equipamiento
            </CardTitle>
            <CardDescription>Conteo por tipo funcional de equipo.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] pt-6">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                    data={stats.typeChartData} 
                    layout="vertical" 
                    margin={{ left: 20, right: 40, top: 0, bottom: 0 }}
                >
                    <XAxis type="number" hide />
                    <YAxis 
                        dataKey="name" 
                        type="category" 
                        fontSize={11} 
                        fontWeight="bold"
                        tickLine={false} 
                        axisLine={false}
                        width={90}
                        tick={{ fill: '#64748b' }}
                    />
                    <Tooltip 
                        cursor={{ fill: '#f1f5f9' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={24}>
                         {stats.typeChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
