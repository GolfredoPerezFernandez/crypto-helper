import { component$ } from '@builder.io/qwik';
import type { ChatMessage } from '~/types/chat';

interface ChatMessageProps {
  message: ChatMessage;
}

export default component$<ChatMessageProps>(({ message }) => {
  const isUser = message.role === 'user';
  
  // Function to format message content with bold text
  const formatMessageContent = (content: string) => {
    // Replace **text** with <strong>text</strong>
    return content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  };
  
  const formattedContent = isUser 
    ? message.content 
    : formatMessageContent(message.content);
  
  return (
    <div class={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        class={`max-w-[85%] p-3 rounded-lg ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-gray-100 text-gray-800 rounded-bl-none'
        }`}
      >
        {isUser ? (
          <div class="whitespace-pre-wrap">{formattedContent}</div>
        ) : (
          // Qwik expects dangerouslySetInnerHTML to be a string
          <div
            class="whitespace-pre-wrap markdown-content"
            dangerouslySetInnerHTML={formattedContent}
          />
        )}
      </div>
    </div>
  );
});
