
// This is a mock in-memory store for demonstration purposes.
// In a real application, use a proper database and secure password hashing.
interface MockUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // In a real app, this would be a securely hashed password
}

const mockUserStore: MockUser[] = [
  // Pre-seed with the original test user for consistency.
  // IMPORTANT: In a real app, "password" would be hashed before storing.
  { id: 'mock-user-0', name: 'Test User', email: 'test@example.com', passwordHash: 'password' },
];
let userIdCounter = mockUserStore.length;

export function addMockUser(user: { name: string; email: string; passwordRaw: string }): { success: boolean; message: string; userId?: string } {
  if (mockUserStore.find(u => u.email === user.email)) {
    return { success: false, message: 'User with this email already exists (mock).' };
  }
  // In a real app, hash user.passwordRaw securely (e.g., with bcrypt)
  // For this mock, we'll store it "as-is" but acknowledge it's wrong for production.
  const newUserId = `mock-user-${userIdCounter++}`;
  mockUserStore.push({ id: newUserId, name: user.name, email: user.email, passwordHash: user.passwordRaw });
  console.log('Mock store after registration:', mockUserStore);
  return { success: true, message: 'Account created successfully! (mock)', userId: newUserId };
}

export function findMockUser(email: string, passwordRaw: string): MockUser | undefined {
  console.log('Mock store at login attempt:', mockUserStore);
  const user = mockUserStore.find(u => u.email === email);
  if (user) {
    // In a real app, compare passwordRaw with user.passwordHash using a secure method (e.g., bcrypt.compare)
    // For this mock, we'll do a direct comparison (INSECURE for production).
    if (user.passwordHash === passwordRaw) {
      return user;
    }
  }
  return undefined;
}
