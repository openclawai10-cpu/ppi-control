import { useEffect, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Send, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface ChannelMessage {
  id: string;
  project_id: string;
  channel: string;
  direction: string;
  content: string;
  metadata: any;
  created_at: string;
}

export default function Channels() {
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [channels, setChannels] = useState<{ channel: string; message_count: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [newMessage, setNewMessage] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = selectedChannel ? `?channel=${selectedChannel}` : '';
      const [messagesRes, channelsRes] = await Promise.all([
        axios.get(`/api/channels/messages${params}`),
        axios.get('/api/channels/list')
      ]);
      setMessages(messagesRes.data);
      setChannels(channelsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedChannel]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await axios.post('/api/channels/messages', {
        channel: selectedChannel || 'system',
        direction: 'outbound',
        content: newMessage
      });
      setNewMessage('');
      fetchData();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const formatDate = (date: string) => {
    return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Canais de Comunicação</h1>
        <p className="text-gray-500">Histórico de comunicações por canal</p>
      </div>

      {/* Channel tabs */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="flex border-b overflow-x-auto">
          <button
            onClick={() => setSelectedChannel('')}
            className={`px-4 py-2 text-sm whitespace-nowrap ${
              !selectedChannel ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Todos
          </button>
          {channels.map((ch) => (
            <button
              key={ch.channel}
              onClick={() => setSelectedChannel(ch.channel)}
              className={`px-4 py-2 text-sm whitespace-nowrap ${
                selectedChannel === ch.channel
                  ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {ch.channel} ({ch.message_count})
            </button>
          ))}
        </div>

        {/* Messages list */}
        <div className="h-[500px] overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Carregando...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-gray-400">Nenhuma mensagem</div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.direction === 'outbound' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`p-2 rounded-lg ${
                  msg.direction === 'outbound' ? 'bg-primary-100' : 'bg-gray-100'
                }`}>
                  {msg.direction === 'outbound' ? (
                    <ArrowUpRight className="w-4 h-4 text-primary-600" />
                  ) : (
                    <ArrowDownLeft className="w-4 h-4 text-gray-600" />
                  )}
                </div>
                <div className={`max-w-[70%] ${msg.direction === 'outbound' ? 'text-right' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-500">{msg.channel}</span>
                    <span className="text-xs text-gray-400">{formatDate(msg.created_at)}</span>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    msg.direction === 'outbound' ? 'bg-primary-50' : 'bg-gray-50'
                  }`}>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Send message */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Digite uma mensagem..."
              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
