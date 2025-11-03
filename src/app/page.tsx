import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="w-full max-w-md p-4">
        <Card className="rounded-xl border-2 border-primary/20 shadow-xl">
          <CardHeader className="space-y-4 text-center">
            <div className="inline-block">
              <Logo className="mx-auto h-12 w-12" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight text-primary">LeadFlowAI</CardTitle>
            <CardDescription className="text-lg">
              Sign in to access your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/dashboard" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="admin@example.com" required defaultValue="admin@example.com" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link href="#" className="ml-auto inline-block text-sm underline">
                    Forgot your password?
                  </Link>
                </div>
                <Input id="password" type="password" required defaultValue="password" />
              </div>
              <Button type="submit" className="w-full text-lg font-semibold">
                Login
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/register">
                  Sign up
                </Link>
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
