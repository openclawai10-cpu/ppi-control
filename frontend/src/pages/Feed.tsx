import { useEffect, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Filter,
  RefreshCw,
  Bot,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText
} from 'lucide-react';

interface FeedLog {
  id: string;
  project_id: string;
  task_id: string;
  agent: string;
  category: string;
  action: string;
  details: any;
  created_at: string;
}

const categoryIcons: Record<string, any> = {
  task: CheckCircle,
  financial: AlertCircle,
  compliance: FileText,
  notification: Clock,
  alert: AlertCircle,
  system: Bot,
  default: Bot
};

const agentColors: Record<string, string> = {
  leader: 'bg-purple-100 text-purple-700',
  financial: 'bg-green-100 text-green-700',
  compliance: 'bg-orange-100 text-orange-700',
  messenger: 'bg-blue-100 text-blue-700',
  database: 'bg-gray-100 text-gray-700',
  purchase: 'bg-yellow-100 text-yellow-700',
  summary: 'bg-indigo-100 text-indigo-700',
  default: 'bg-gray-100 text-gray-600'
};

export default function Feed() {
  const [logs, setLogs] = useState<FeedLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    agent: '',
    category: ''
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.agent) params.append('agent', filter.agent);
      if (filter.category) params.append('category', filter.category);
      params.append('limit', '100');

      const response = await axios.get(`/api/feed?${params.toString()}`);
      setLogs(response.data);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const formatDate = (date: string) => {
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getCategoryIcon = (category: string) => {
    return categoryIcons[category] || categoryIcons.default;
  };

  const getAgentColor = (agent: string) => {
    return agentColors[agent] || agentColors.default;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feed do Sistema</h1>
          <p className="text-gray-500">Registro de atividades por categoria e projeto</p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="font-medium">Filtros</span>
        </div>
        <div className="flex gap-4">
          <select
            value={filter.agent}
            onChange={(e) => setFilter({ ...filter, agent: e.target.value })}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos os agentes</option>
            <option value="leader">Líder</option>
            <option value="financial">Financeiro</option>
            <option value="compliance">Compliance</option>
            <option value="messenger">Mensageiro</option>
            <option value="database">Banco de Dados</option>
            <option value="purchase">Compras</option>
            <option value="summary">Resumo</option>
          </select>
          <select
            value={filter.category}
            onChange={(e) => setFilter({ ...filter, category: e.target.value })}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todas as categorias</option>
            <option value="task">Tarefa</option>
            <option value="financial">Financeiro</option>
            <option value="compliance">Compliance</option>
            <option value="notification">Notificação</option>
            <option value="alert">Alerta</option>
            <option value="system">Sistema</option>
          </select>
        </div>
      </div>

      {/* Feed list */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Carregando...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Nenhum registro encontrado</div>
        ) : (
          logs.map((log) => {
            const Icon = getCategoryIcon(log.category);
            return (
              <div
                key={log.id}
                className="bg-white rounded-lg border p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${getAgentColor(log.agent)}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${getAgentColor(log.agent)}`}>
                        {log.agent}
                      </span>
                      <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                        {log.category}
                      </span>
                    </div>
                    <p className="font-medium">{log.action}</p>
                    {log.details && (
                      <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                    <p className="text-xs text-gray-400 mt-2">{formatDate(log.created_at)}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
