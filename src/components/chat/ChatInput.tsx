import { component$, useSignal } from '@builder.io/qwik';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

export default component$<ChatInputProps>(({ onSendMessage, isLoading = false }) => {
  const messageText = useSignal('');

  return (
    <div class="flex items-start gap-2 w-full px-4 py-3">
      <textarea
        value={messageText.value}
        onChange$={(e) => (messageText.value = (e.target as HTMLTextAreaElement).value)}
        onKeyDown$={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (messageText.value.trim() && !isLoading) {
              onSendMessage(messageText.value);
              messageText.value = '';
            }
          }
        }}
        placeholder="Type your message here..."
        class="w-full rounded-lg border border-gray-300 p-3 min-h-[60px] max-h-36 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={isLoading}
      />
      <button
        onClick$={() => {
          if (messageText.value.trim() && !isLoading) {
            onSendMessage(messageText.value);
            messageText.value = '';
          }
        }}
        class="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-3 h-[60px] disabled:opacity-50 flex-shrink-0"
        disabled={isLoading || !messageText.value.trim()}
      >
        Send
      </button>
    </div>
  );
});
