import { Utensils } from "lucide-react";

export default function MisValesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-primary text-white p-4 shadow-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-3">
            <Utensils className="h-6 w-6" />
            <h1 className="text-xl font-bold uppercase tracking-wider font-headline">Portal de Vales</h1>
        </div>
      </header>
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
        {children}
      </main>
      <footer className="text-center py-6 text-sm text-muted-foreground border-t bg-white mt-auto">
        Hospital de Curepto - Portal del Funcionario
      </footer>
    </div>
  );
}
