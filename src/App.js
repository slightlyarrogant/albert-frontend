import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { HistoryIcon, SendIcon, LogOut, Star, Copy, CheckCircle, UserIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

function generateChatID() {
  return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

const CustomLink = ({ href, children }) => (
  <a 
    href={href} 
    className="text-blue-600 hover:text-blue-800 underline"
    target="_blank" 
    rel="noopener noreferrer"
  >
    {children}
  </a>
);

function App() {
  const [session, setSession] = useState(null);
  const [chatID, setChatID] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setChatID(generateChatID());
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setChatID(generateChatID());
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-6 text-center">Zaloguj się do czatu</h1>
          <Auth 
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            theme="light"
            providers={['google', 'facebook']}
          />
        </div>
      </div>
    );
  }

  return <UserBotChat session={session} chatID={chatID} />;
}

function UserBotChat({ session, chatID }) {
  const [currentChat, setCurrentChat] = useState([]);
  const [userMessage, setUserMessage] = useState("");
  const [relatedTopics, setRelatedTopics] = useState([]);
  const [ratings, setRatings] = useState({});
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = React.useRef(null);
  const chatContainerRef = React.useRef(null);

  const fetchConversationHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('chat_id', chatID)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setCurrentChat(data.map(item => ({
        sender: item.is_bot ? 'bot' : 'user',
        message: item.message
      })));
    } catch (error) {
      console.error('Error fetching conversation history:', error);
    }
  }, [chatID]);

  useEffect(() => {
    fetchConversationHistory();
  }, [fetchConversationHistory]);

  const sendMessageToWebhook = async (userMessage) => {
    const url = new URL('https://vendoerp.app.n8n.cloud/webhook/1a24ef20-03e9-48b0-b84f-22f7bb2dffbf');
    
    const params = new URLSearchParams({
      chatId: chatID,
      userId: session.user.id,
      chatInput: userMessage
    });

    url.search = params.toString();

    try {
      const response = await fetch(url);
      const data = await response.text();
      return data;
    } catch (error) {
      console.error("Error sending message:", error);
      return "There was an error fetching the bot's response.";
    }
  };

  const handleSendMessage = async (message = userMessage) => {
    if (message.trim() === "") return;

    const newUserMessage = { sender: "user", message: message };
    setCurrentChat(prev => [...prev, newUserMessage]);
    setUserMessage("");
    setRelatedTopics([]);

    // Store user message in the database
    await storeMessage(newUserMessage.message, false);

    setCurrentChat(prev => [...prev, { sender: "bot", message: "typing..." }]);

    const botReply = await sendMessageToWebhook(message);

    const newBotMessage = { sender: "bot", message: botReply };
    setCurrentChat(prev => [...prev.slice(0, -1), newBotMessage]);

    // Store bot message in the database
    await storeMessage(botReply, true);
  };

  const storeMessage = async (message, isBot) => {
    try {
      await supabase
        .from('conversations')
        .insert({
          user_id: session.user.id,
          chat_id: chatID,
          message: message,
          is_bot: isBot
        });
    } catch (error) {
      console.error('Error storing message:', error);
    }
  };

  const handleRating = async (index, rating) => {
    setRatings(prev => ({...prev, [index]: rating}));
    
    try {
      await supabase
        .from('message_ratings')
        .upsert({
          message_index: index,
          user_id: session.user.id,
          chat_id: chatID,
          rating: rating,
          message: currentChat[index].message
        }, {
          onConflict: ['chat_id', 'message_index', 'user_id'],
          returning: 'minimal'
        });

      console.log('Rating stored successfully');
    } catch (error) {
      console.error('Error storing rating:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  return (
    <div className="flex h-screen bg-gray-100 text-lg overflow-hidden">
      {/* Left column - Chat history */}
      <div className="w-[20%] bg-white border-r overflow-y-auto flex flex-col">
        <div className="p-3 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold flex items-center">
            <HistoryIcon className="mr-2" /> Historia czatu
          </h2>
          <button
            onClick={handleSignOut}
            className="text-gray-500 hover:text-gray-700"
            title="Wyloguj się"
          >
            <LogOut size={20} />
          </button>
        </div>
        <div className="flex-grow h-[calc(100vh-6rem)] overflow-y-auto">
          {/* Chat history can be added here */}
        </div>
        <div className="p-3 border-t flex items-center">
          <Avatar className="h-8 w-8 mr-2 bg-blue-500 rounded-full flex items-center justify-center">
            <UserIcon className="text-white" size={20} />
          </Avatar>
          <span className="text-sm font-medium">{session.user.email}</span>
        </div>
      </div>
      {/* Main chat area */}
      <div className="flex flex-col flex-1 bg-gray-100">
        <div className="flex-1 overflow-hidden px-[20%]">
          {/* Chat header */}
          <div className="flex items-center p-3 border-b bg-white">
            <Avatar className="h-8 w-8 rounded-full overflow-hidden">
              <AvatarImage 
                src="/albert.png" 
                alt="Albert Avatar" 
                className="h-full w-full object-cover"
              />
              <AvatarFallback>AI</AvatarFallback>
            </Avatar>
            <h2 className="ml-3 text-2xl font-semibold">Asystent AI</h2>
          </div>
          {/* Messages */}
          <div 
            ref={chatContainerRef}
            className="h-[calc(100vh-10rem)] py-4 overflow-y-auto"
          >
            {currentChat.map((msg, index) => (
              <div key={index} className="mb-6">
                <div className="flex items-start">
                  <Avatar className="h-8 w-8 mr-3 flex-shrink-0 rounded-full overflow-hidden">
                    {msg.sender === "user" ? (
                      <div className="bg-blue-500 h-full w-full flex items-center justify-center">
                        <UserIcon className="text-white" size={20} />
                      </div>
                    ) : (
                      <AvatarImage 
                        src="/albert.png" 
                        alt="Albert Avatar" 
                        className="h-full w-full object-cover"
                      />
                    )}
                  </Avatar>
                  <div className={`flex-1 p-4 rounded-lg ${
                    msg.sender === "user" 
                      ? "bg-blue-100 border border-blue-200" 
                      : "bg-gray-100 border border-gray-200"
                  }`}>
                    {msg.message === "typing..." ? (
                      <div className="dots text-2xl">
                        <span>.</span><span>.</span><span>.</span>
                      </div>
                    ) : (
                      <ReactMarkdown 
                        className="prose prose-lg max-w-none"
                        components={{
                          a: CustomLink
                        }}
                      >
                        {msg.message.split("RELATED_TOPICS:")[0].trim()}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
                {msg.sender === "bot" && msg.message !== "typing..." && (
                  <div className="mt-2 ml-11 flex items-center">
                    <div className="flex mr-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={20}
                          onClick={() => handleRating(index, star)}
                          className={`cursor-pointer ${
                            star <= (ratings[index] || 0)
                              ? "text-yellow-400 fill-current"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    {copiedIndex === index ? (
                      <CheckCircle size={20} className="text-green-500" />
                    ) : (
                      <Copy
                        size={20}
                        className="cursor-pointer text-gray-500 hover:text-gray-700"
                        onClick={() => copyToClipboard(msg.message, index)}
                      />
                    )}
                  </div>
                )}
                {/* Related Topics */}
                {msg.sender === "bot" && relatedTopics.length > 0 && index === currentChat.length - 1 && (
                  <div className="mt-2 ml-11 space-y-2">
                    {relatedTopics.map((topic, topicIndex) => (
                      <button
                        key={topicIndex}
                        className="w-full text-left p-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                        onClick={() => handleSendMessage(topic)}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
        {/* Input area */}
        <div className="p-4 bg-white border-t mx-[20%]">
          <div className="flex items-center space-x-3">
            <input
              type="text"
              className="flex-1 border border-gray-300 rounded px-4 py-3 text-lg"
              placeholder="Wpisz swoją wiadomość..."
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className="p-3 bg-blue-500 text-white rounded-full"
              onClick={() => handleSendMessage()}
            >
              <SendIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
