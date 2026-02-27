import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Brain,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  Lightbulb,
  Download,
  RefreshCw,
  Activity,
  DollarSign
} from 'lucide-react';

interface Suggestion {
  type: string;
  priority: string;
  title: string;
  description: string;
  action: string;
}

interface HealthData {
  status: string;
  healthScore: number;
  metrics: any;
  recomendacoes: string[];
}

export default function Analysis() {
  const [projectId, setProjectId] = useState<string>('');
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get('/api/projects').then(res => setProjects(res.data));
  }, []);

  useEffect(() => {
    if (projectId) {
      fetchAnalysis();
    }
  }, [projectId]);

  const fetchAnalysis = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [suggestionsRes, healthRes] = await Promise.all([
        axios.get(`/api/ai/suggestions/${projectId}`),
        axios.get(`/api/ai/health/${projectId}`)
      ]);
      setSuggestions(suggestionsRes.data.suggestions || []);
      setHealth(healthRes.data);
    } catch (error) {
      console.error('Failed to fetch analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (type: string) => {
    if (!projectId) return;
    try {
      const url = `/api/reports/${type}/${projectId}`;
      window.open(url, '_blank');
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-green-500 bg-green-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-7 h-7 text-primary-600" />
            Análise Inteligente
          </h1>
          <p className="text-gray-500">IA para análise de riscos e sugestões automáticas</p>
        </div>
        <div className="flex gap-2">
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Selecione um projeto</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            onClick={fetchAnalysis}
            disabled={!projectId || loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Analisando dados...</div>
      ) : !projectId ? (
        <div className="text-center py-12 text-gray-400">Selecione um projeto para análise</div>
      ) : (
        <>
          {/* Health Score */}
          {health && (
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Saúde do Projeto</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(health.status)}`}>
                  {health.status === 'healthy' ? 'Saudável' : health.status === 'warning' ? 'Atenção' : 'Crítico'}
                </span>
              </div>

              <div className="flex items-center gap-6 mb-6">
                <div className="relative w-32 h-32">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#e5e7eb"
                      strokeWidth="12"
                      fill="none"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke={health.healthScore >= 75 ? '#22c55e' : health.healthScore >= 50 ? '#eab308' : '#ef4444'}
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${health.healthScore * 3.52} 352`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold">{health.healthScore}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 flex-1">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Activity className="w-4 h-4" />
                      Tarefas
                    </div>
                    <p className="text-xl font-bold">{health.metrics.tarefas?.total || 0}</p>
                    <p className="text-xs text-gray-400">{health.metrics.tarefas?.concluidas || 0} concluídas</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <DollarSign className="w-4 h-4" />
                      Financeiro
                    </div>
                    <p className="text-xl font-bold">{formatCurrency(health.metrics.financeiro?.pago || 0)}</p>
                    <p className="text-xs text-gray-400">{formatCurrency(health.metrics.financeiro?.pendente || 0)} pendente</p>
                  </div>
                </div>
              </div>

              {health.recomendacoes?.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-500 mb-2">Recomendações:</p>
                  <ul className="space-y-1">
                    {health.recomendacoes.map((rec, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Sugestões da IA */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Sugestões Inteligentes ({suggestions.length})
            </h2>

            {suggestions.length === 0 ? (
              <p className="text-gray-400 text-center py-4">Nenhuma sugestão no momento</p>
            ) : (
              <div className="space-y-3">
                {suggestions.map((s, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-lg border-l-4 ${getPriorityColor(s.priority)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{s.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{s.description}</p>
                      </div>
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        s.priority === 'high' ? 'bg-red-100 text-red-700' :
                        s.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {s.priority === 'high' ? 'Alta' : s.priority === 'medium' ? 'Média' : 'Baixa'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Exportar Relatórios */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Download className="w-5 h-5 text-primary-600" />
              Exportar Relatórios
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => exportReport('financial')}
                className="p-4 border rounded-lg hover:bg-gray-50 text-center"
              >
                <DollarSign className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <p className="text-sm font-medium">Financeiro</p>
                <p className="text-xs text-gray-400">CSV</p>
              </button>
              <button
                onClick={() => exportReport('bolsistas')}
                className="p-4 border rounded-lg hover:bg-gray-50 text-center"
              >
                <Activity className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <p className="text-sm font-medium">Bolsistas</p>
                <p className="text-xs text-gray-400">CSV</p>
              </button>
              <button
                onClick={() => exportReport('riscos')}
                className="p-4 border rounded-lg hover:bg-gray-50 text-center"
              >
                <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
                <p className="text-sm font-medium">Riscos</p>
                <p className="text-xs text-gray-400">CSV</p>
              </button>
              <button
                onClick={() => window.open(`/api/reports/prestacao-contas/${projectId}`, '_blank')}
                className="p-4 border rounded-lg hover:bg-gray-50 text-center"
              >
                <TrendingUp className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                <p className="text-sm font-medium">Prestação Contas</p>
                <p className="text-xs text-gray-400">JSON</p>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
