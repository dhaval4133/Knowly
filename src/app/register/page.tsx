import RegisterForm from '@/components/auth/register-form';

export default function RegisterPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)]"> {/* Adjust min-height as needed */}
      <div className="w-full max-w-md">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">Create an Account</h1>
          <p className="text-muted-foreground mt-2">
            Join Knowly to start asking questions and sharing your expertise.
          </p>
        </header>
        <RegisterForm />
      </div>
    </div>
  );
}
