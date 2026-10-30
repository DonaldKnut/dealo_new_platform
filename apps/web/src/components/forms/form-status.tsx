export function FormStatus({
  error,
  message,
}: {
  error?: string | null;
  message?: string | null;
}) {
  if (!error && !message) return null;

  return (
    <>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {message ? <p className="text-sm text-success">{message}</p> : null}
    </>
  );
}
