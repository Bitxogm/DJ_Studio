import { LoginForm } from '@/components/auth/LoginForm';
import { QuickLoginSection } from '@/components/auth/QuickLoginSection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  return (
    <Card className="w-full border-border/60 bg-card/80 shadow-xl backdrop-blur">
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>Vuelve a tu estudio y sigue produciendo.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
        <QuickLoginSection />
      </CardContent>
    </Card>
  );
}
