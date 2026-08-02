import { RegisterForm } from '@/components/auth/RegisterForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function RegisterPage() {
  return (
    <Card className="w-full border-border/60 bg-card/80 shadow-xl backdrop-blur">
      <CardHeader>
        <CardTitle>Crear cuenta</CardTitle>
        <CardDescription>Monta tu estudio en el navegador en segundos.</CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
    </Card>
  );
}
