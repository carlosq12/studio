'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { registerCustomUser } from '../actions';

export default function RegistroPage() {
    const [rut, setRut] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast({ variant: 'destructive', title: 'Error', description: 'Las contraseñas no coinciden.' });
            return;
        }

        setIsLoading(true);
        try {
            // Nota: En un sistema en producción real, NUNCA enviar la contraseña en texto plano
            // o guardarla sin hashear fuertemente en el servidor.
            // Para este caso básico, usaremos un cifrado muy simple en Base64 solo para no enviarla "desnuda",
            // aunque el servidor debería usar bcrypt u otro similar.
            const passwordHash = btoa(password); 

            // Validar RUT en la DB y crear el registro "Pendiente"
            const result = await registerCustomUser(rut, email, passwordHash);

            if (result.error) {
                throw new Error(result.error);
            }

            toast({
                title: 'Registro exitoso',
                description: 'Tu cuenta ha sido creada y está pendiente de aprobación por Recursos Humanos.',
            });
            router.push('/mis-vales/login?registered=true');

        } catch (error: any) {
            console.error("Error en registro:", error);
            toast({ variant: 'destructive', title: 'Registro fallido', description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex-1 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Regístrate</CardTitle>
                    <CardDescription>Crea tu cuenta para revisar tus vales de alimentación.</CardDescription>
                </CardHeader>
                <form onSubmit={handleRegister}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="rut">RUT</Label>
                            <Input id="rut" type="text" placeholder="Ej: 12345678-9" required value={rut} onChange={(e) => setRut(e.target.value)} />
                            <p className="text-xs text-muted-foreground">Tu RUT debe estar previamente ingresado por RRHH en el sistema de vales.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Correo Electrónico</Label>
                            <Input id="email" type="email" placeholder="correo@ejemplo.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                            <Input id="confirmPassword" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={6} />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {isLoading ? 'Validando y Creando...' : 'Registrarse'}
                        </Button>
                        <p className="text-sm text-center text-muted-foreground">
                            ¿Ya tienes cuenta? <Link href="/mis-vales/login" className="text-primary hover:underline">Inicia Sesión</Link>
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
