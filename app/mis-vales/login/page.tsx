'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { loginUserDB } from '../actions';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        // Al entrar a login, limpiamos cualquier sesión anterior
        localStorage.removeItem('funcionario_rut');
        localStorage.removeItem('funcionario_nombres');
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const passwordHash = btoa(password);
            
            const result = await loginUserDB(email, passwordHash);

            if (result.error || !result.user) {
                toast({ variant: 'destructive', title: 'Error de acceso', description: result.error || 'Credenciales inválidas.' });
                return;
            }

            const { estado, rut, nombres, apellidos } = result.user;

            if (estado === 'Pendiente') {
                toast({ variant: 'destructive', title: 'Cuenta Pendiente', description: 'Tu cuenta aún no ha sido aprobada por Recursos Humanos. Intenta más tarde.' });
                return;
            }

            if (estado === 'Rechazado') {
                toast({ variant: 'destructive', title: 'Cuenta Rechazada', description: 'Tu solicitud de cuenta ha sido rechazada.' });
                return;
            }

            if (estado === 'Aprobado') {
                // Guardar la sesión en localStorage
                localStorage.setItem('funcionario_rut', rut);
                localStorage.setItem('funcionario_nombres', `${nombres} ${apellidos}`);
                
                toast({ title: 'Bienvenido', description: 'Iniciando sesión...' });
                router.push('/mis-vales/dashboard');
            } else {
                 throw new Error("Estado de usuario desconocido.");
            }

        } catch (error: any) {
            console.error("Error en login:", error);
            toast({ variant: 'destructive', title: 'Error de acceso', description: 'Hubo un problema al intentar iniciar sesión.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex-1 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
                    <CardDescription>Ingresa para consultar tus vales.</CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Correo Electrónico</Label>
                            <Input id="email" type="email" placeholder="correo@ejemplo.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {isLoading ? 'Ingresando...' : 'Entrar'}
                        </Button>
                        <p className="text-sm text-center text-muted-foreground">
                            ¿No tienes cuenta? <Link href="/mis-vales/registro" className="text-primary hover:underline">Regístrate aquí</Link>
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
