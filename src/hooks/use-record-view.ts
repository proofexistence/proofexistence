import { useMutation } from '@tanstack/react-query';

export function useRecordView() {
  const { mutate: recordView } = useMutation({
    mutationFn: async (sessionId: string) => {
      await fetch('/api/engagement/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
    },
    onError: (err) => {
      console.error('Failed to record view:', err);
    },
  });

  return { recordView };
}
