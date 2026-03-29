import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, onSnapshot, orderBy, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Send, User, Briefcase } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import Loader from '../components/Loader';

export default function Chat() {
  const { chatId } = useParams();
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [activeChatDetails, setActiveChatDetails] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch list of chats
  useEffect(() => {
    if (!userData) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userData.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const chatPromises = snapshot.docs.map(async (chatDoc) => {
          const data = chatDoc.data();
          const otherUserId = data.participants.find((id: string) => id !== userData.uid);
          
          // Fetch other user's name
          let otherUserName = 'Unknown User';
          if (otherUserId) {
            const userDoc = await getDoc(doc(db, 'users', otherUserId));
            if (userDoc.exists()) {
              otherUserName = userDoc.data().name;
            }
          }

          // Fetch job details if exists
          let jobTitle = '';
          if (data.jobId) {
            const jobDoc = await getDoc(doc(db, 'jobs', data.jobId));
            if (jobDoc.exists()) {
              jobTitle = jobDoc.data().title;
            }
          }

          return {
            id: chatDoc.id,
            ...(data as any),
            otherUserName,
            jobTitle,
          };
        });

        const resolvedChats = await Promise.all(chatPromises);
        // Sort by updatedAt descending
        resolvedChats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setChats(resolvedChats);
        setLoadingChats(false);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'chats');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats');
    });

    return () => unsubscribe();
  }, [userData]);

  // Fetch messages for active chat
  useEffect(() => {
    if (!chatId || !userData) {
      setMessages([]);
      setActiveChatDetails(null);
      return;
    }

    const activeChat = chats.find(c => c.id === chatId);
    if (activeChat) {
      setActiveChatDetails(activeChat);
    }

    const q = query(
      collection(db, `chats/${chatId}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      setMessages(newMessages);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${chatId}/messages`);
    });

    return () => unsubscribe();
  }, [chatId, userData, chats]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId || !userData) return;

    const messageText = newMessage;
    setNewMessage('');

    try {
      await addDoc(collection(db, `chats/${chatId}/messages`), {
        chatId,
        senderId: userData.uid,
        text: messageText,
        createdAt: new Date().toISOString(),
      });

      // Update chat's updatedAt
      await updateDoc(doc(db, 'chats', chatId), {
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `chats/${chatId}/messages`);
    }
  };

  if (loadingChats) return <Loader />;

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden flex h-[calc(100vh-12rem)]">
      {/* Sidebar - Chat List */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-medium text-black">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">No conversations yet.</div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {chats.map(chat => (
                <li key={chat.id}>
                  <Link
                    to={`/chat/${chat.id}`}
                    className={`block p-4 hover:bg-gray-50 transition-colors ${chatId === chat.id ? 'bg-gray-100 border-l-4 border-black' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-black truncate">
                        {chat.otherUserName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(chat.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {chat.jobTitle && (
                      <p className="text-xs text-gray-500 truncate mt-1 flex items-center">
                        <Briefcase className="h-3 w-3 mr-1" /> {chat.jobTitle}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="w-2/3 flex flex-col bg-gray-50">
        {chatId ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-gray-200 rounded-full p-2 mr-3">
                  <User className="h-5 w-5 text-black" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-black">{activeChatDetails?.otherUserName || 'Loading...'}</h3>
                  {activeChatDetails?.jobTitle && (
                    <p className="text-xs text-gray-500 flex items-center">
                      <Briefcase className="h-3 w-3 mr-1" /> {activeChatDetails.jobTitle}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 text-sm mt-10">No messages yet. Say hi!</div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.senderId === userData?.uid;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-lg px-4 py-2 ${isMe ? 'bg-black text-white rounded-br-none' : 'bg-white border border-gray-200 text-black rounded-bl-none'}`}>
                        <p className="text-sm">{msg.text}</p>
                        <p className={`text-[10px] mt-1 ${isMe ? 'text-gray-300' : 'text-gray-400'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-200">
              <form onSubmit={handleSendMessage} className="flex space-x-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 focus:ring-black focus:border-black block w-full rounded-md sm:text-sm border-gray-300 px-4 py-2 border"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black hover:bg-gray-800 focus:outline-none disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
