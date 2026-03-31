'use client';

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FuncionarioVale } from '@/lib/types';
import { addFuncionarioVale, updateFuncionarioVale } from '../actions';

const funcionarioSchema = z.object({
  RUT: z.string().min(1, 'El RUT es requerido'),
  nombres: z.string().min(1, 'El nombre es requerido'),
  apellidos: z.string().optional(),
  departamento: z.string().optional(),
  cargo: z.string().optional(),
  acNo: z.string().optional(),
  jornada: z.string().optional(),
  estado: z.string().optional(),
});

type FormValues = z.infer<typeof funcionarioSchema>;

interface AddFuncionarioValeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    funcionario: FuncionarioVale | null;
}

export function AddFuncionarioValeDialog({ open, onOpenChange, funcionario }: AddFuncionarioValeDialogProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(funcionarioSchema),
        defaultValues: {
            RUT: "",
            nombres: "",
            apellidos: "",
            departamento: "",
            cargo: "",
            acNo: "",
            jornada: "",
            estado: "Activo",
        },
    });

    useEffect(() => {
        if (funcionario && open) {
            form.reset({
                RUT: funcionario.RUT,
                nombres: funcionario.nombres,
                apellidos: funcionario.apellidos || "",
                departamento: funcionario.departamento || "",
                cargo: funcionario.cargo || "",
                acNo: funcionario.acNo || "",
                jornada: funcionario.jornada || "",
                estado: funcionario.estado || "Activo",
            });
        } else if (!open) {
            form.reset({
                RUT: "",
                nombres: "",
                apellidos: "",
                departamento: "",
                cargo: "",
                acNo: "",
                jornada: "",
                estado: "Activo",
            });
        }
    }, [funcionario, open, form]);

    const onSubmit = async (values: FormValues) => {
        setIsSubmitting(true);
        try {
            let result;
            if (funcionario) {
                result = await updateFuncionarioVale({ id: funcionario.id, ...values });
            } else {
                result = await addFuncionarioVale(values);
            }
            
            if (result.error) throw new Error(result.error);
            
            toast({
                title: funcionario ? "Funcionario actualizado" : "Funcionario agregado",
                description: "La base de datos de Vales se ha actualizado.",
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
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{funcionario ? 'Editar Funcionario' : 'Agregar Funcionario'}</DialogTitle>
                    <DialogDescription>
                        {funcionario ? 'Modifica los datos del funcionario para la entrega de vales.' : 'Registra un nuevo funcionario vinculado al programa de vales.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="RUT"
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
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="acNo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>AC-No. (Reloj)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ej: 1234" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="jornada"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Jornada / Turno</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ej: T4" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="departamento"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Departamento / Unidad</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ej: Informática" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="estado"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Estado</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder="Estado..." /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Activo">Activo</SelectItem>
                                                <SelectItem value="Inactivo">Inactivo</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar Funcionario'}</Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
