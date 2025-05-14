import LoginForm from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)]"> {/* Adjust min-height as needed */}
      <div className="w-full max-w-md">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">Login to Knowly</h1>
          <p className="text-muted-foreground mt-2">
            Access your account to ask, answer, and learn.
          </p>
        </header>
        <LoginForm />
      </div>
    </div>
  );
}
