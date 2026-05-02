export default function LoginPage() {
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div>
        <h1>ApolloEMS Login</h1>
        <p>Login with your company Google account</p>

        <button
          style={{
            marginTop: 20,
            padding: '10px 20px',
            fontSize: 16,
            cursor: 'pointer'
          }}
          onClick={() => alert('Google login coming next')}
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}