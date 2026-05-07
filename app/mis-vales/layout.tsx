import { Utensils } from "lucide-react";

export default function MisValesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-primary text-white p-4 shadow-lg sticky top-0 z-50 backdrop-blur-md bg-opacity-95">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Utensils className="h-5 w-5" />
              <h1 className="text-sm font-black uppercase tracking-widest font-headline">Portal de Vales</h1>
            </div>
            <div className="text-[10px] font-bold opacity-70 uppercase tracking-tighter hidden sm:block">
              Hospital de Curepto
            </div>
        </div>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {children}
      </main>
      <footer className="text-center py-6 text-sm text-muted-foreground border-t bg-white mt-auto">
        Hospital de Curepto - Portal del Funcionario
      </footer>
    </div>
  );
}
