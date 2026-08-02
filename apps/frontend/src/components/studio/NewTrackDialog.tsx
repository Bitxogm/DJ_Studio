'use client';

import { useState } from 'react';
import { TRACK_TYPES } from '@beatforge/shared';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { ApiRequestError } from '@/lib/api/httpError';
import { createTrackRequest } from '@/lib/api/tracks';
import { newTrackSchema, type NewTrackFormValues } from '@/lib/validation/studio';
import { useStudioStore } from '@/store/studio';

interface NewTrackDialogProps {
  projectId: string;
}

export function NewTrackDialog({ projectId }: NewTrackDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addTrack = useStudioStore((state) => state.addTrack);
  const tracksCount = useStudioStore((state) => state.tracks.length);

  const form = useForm<NewTrackFormValues>({
    resolver: zodResolver(newTrackSchema),
    defaultValues: { name: '', type: undefined },
  });

  async function onSubmit(values: NewTrackFormValues) {
    setIsSubmitting(true);
    try {
      const track = await createTrackRequest(projectId, { ...values, order: tracksCount });
      addTrack(track);
      toast.success(`Track "${track.name}" añadido`);
      setOpen(false);
      form.reset({ name: '', type: undefined });
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
        <Button type="button" variant="outline" className="w-full gap-2">
          <Plus className="size-4" />
          Añadir track
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo track</DialogTitle>
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
                    <Input placeholder="Kick, Bajo, Lead..." autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TRACK_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Spinner className="size-4" /> : 'Añadir track'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
