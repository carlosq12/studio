import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { UsuarioFuncionario } from '@/lib/types';
import { updateUser } from '../actions';

interface EditUsuarioDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    usuario: UsuarioFuncionario | null;
}

export function EditUsuarioDialog({ open, onOpenChange, usuario }: EditUsuarioDialogProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm({
        defaultValues: {
            rut: "",
            nombres: "",
            apellidos: "",
            email: "",
            contrasena: "",
        },
    });

    useEffect(() => {
        if (usuario && open) {
            let decodedPassword = "";
            try {
                if (usuario.password) decodedPassword = atob(usuario.password);
            } catch (e) {
                decodedPassword = usuario.password || "";
            }

            form.reset({
                rut: usuario.rut || "",
                nombres: usuario.nombres || "",
                apellidos: usuario.apellidos || "",
                email: usuario.email || "",
                contrasena: decodedPassword,
            });
        }
    }, [usuario, open, form]);

    const onSubmit = async (values: any) => {
        if (!usuario) return;
        setIsSubmitting(true);
        try {
            const updateData: any = {
                rut: values.rut,
                nombres: values.nombres,
                apellidos: values.apellidos,
                email: values.email
            };
            
            if (values.contrasena && values.contrasena.trim() !== '') {
                updateData.password = btoa(values.contrasena);
            }

            const result = await updateUser(usuario.id, updateData);
            if (result.error) throw new Error(result.error);
            
            toast({
                title: "Usuario actualizado",
                description: "Los datos del usuario han sido modificados exitosamente.",
            });
            onOpenChange(false);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Ocurrió un error inesperado.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Editar Usuario</DialogTitle>
                    <DialogDescription>
                        Modifica los datos del usuario.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="rut"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>RUT</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: 12345678-9" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="nombres"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nombres</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Nombres..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="apellidos"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Apellidos</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Apellidos..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Correo Electrónico</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="correo@ejemplo.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="contrasena"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contraseña Actual</FormLabel>
                                    <FormControl>
                                        <Input type="text" placeholder="Contraseña..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar Cambios'}</Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
