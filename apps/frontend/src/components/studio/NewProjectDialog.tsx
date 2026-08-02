'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { ApiRequestError } from '@/lib/api/httpError';
import { createProjectRequest } from '@/lib/api/projects';
import { newProjectSchema, type NewProjectFormValues } from '@/lib/validation/studio';
import { useStudioStore } from '@/store/studio';

export function NewProjectDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addProject = useStudioStore((state) => state.addProject);
  const selectProject = useStudioStore((state) => state.selectProject);

  const form = useForm<NewProjectFormValues>({
    resolver: zodResolver(newProjectSchema),
    defaultValues: { name: '', bpm: '', key: '' },
  });

  async function onSubmit(values: NewProjectFormValues) {
    setIsSubmitting(true);
    try {
      const project = await createProjectRequest({
        name: values.name,
        bpm: values.bpm && values.bpm.trim() !== '' ? Number(values.bpm) : undefined,
        key: values.key && values.key.trim() !== '' ? values.key.trim() : undefined,
      });
      addProject(project);
      selectProject(project.id);
      toast.success(`Proyecto "${project.name}" creado`);
      setOpen(false);
      form.reset({ name: '', bpm: '', key: '' });
    } catch (error) {
      toast.error(
        error instanceof ApiRequestError ? error.message : 'No se pudo conectar con el servidor',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full justify-start gap-2" variant="secondary">
          <Plus className="size-4" />
          Nuevo proyecto
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo proyecto</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(event) => void form.handleSubmit(onSubmit)(event)}
            className="space-y-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Mi nueva sesión" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bpm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>BPM (opcional)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="120" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tonalidad (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Am" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Spinner className="size-4" /> : 'Crear proyecto'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
