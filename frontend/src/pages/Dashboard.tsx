import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Activity
} from 'lucide-react';

interface DashboardStats {
  tasks: {
    byColumn: Record<string, number>;
    byPriority: Record<string, number>;
    total: number;
  };
  financial: {
    total: { count: number; amount: number };
    paid: { count: number; amount: number };
    pending: { count: number; amount: number };
  };
  risks: {
    bySeverity: Record<string, number>;
    byStatus: Record<string, number>;
    total: number;
  };
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState<string>('');
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
  
      const [tasksRes, financialRes, risksRes, projectsRes] = await Promise.all([
        axios.get(`/api/agents/summary/action?action=summary:tasks&payload=${JSON.stringify({ projectId })}`),
        axios.get(`/api/agents/summary/action?action=summary:financial&payload=${JSON.stringify({ projectId })}`),
        axios.get(`/api/agents/summary/action?action=summary:risks&payload=${JSON.stringify({ projectId })}`),
        axios.get('/api/projects')
      ]);

      setStats({
        tasks: tasksRes.data.result || { byColumn: {}, byPriority: {}, total: 0 },
        financial: financialRes.data.result || { total: { count: 0, amount: 0 }, paid: { count: 0, amount: 0 }, pending: { count: 0, amount: 0 } },
        risks: risksRes.data.result || { bySeverity: {}, byStatus: {}, total: 0 }
      });
      setProjects(projectsRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Carregando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-500">Visão geral do sistema</p>
        </div>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Todos os projetos</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total de Tarefas</p>
              <p className="text-2xl font-bold">{stats?.tasks.total || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pago</p>
              <p className="text-2xl font-bold">{formatCurrency(stats?.financial.paid.amount || 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pendente</p>
              <p className="text-2xl font-bold">{formatCurrency(stats?.financial.pending.amount || 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Riscos Ativos</p>
              <p className="text-2xl font-bold">{stats?.risks.byStatus.active || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks by column */}
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-primary-600" />
            Tarefas por Coluna
          </h3>
          <div className="space-y-3">
            {Object.entries(stats?.tasks.byColumn || {}).map(([column, count]) => (
              <div key={column} className="flex items-center justify-between">
                <span className="capitalize">{column.replace('_', ' ')}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full"
                      style={{ width: `${(count / (stats?.tasks.total || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risks by severity */}
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Riscos por Severidade
          </h3>
          <div className="space-y-3">
            {Object.entries(stats?.risks.bySeverity || {}).map(([severity, count]) => (
              <div key={severity} className="flex items-center justify-between">
                <span className="capitalize">{severity}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        severity === 'high' ? 'bg-red-500' :
                        severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${(count / (stats?.risks.total || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial summary */}
        <div className="bg-white rounded-lg border p-4 lg:col-span-2">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Resumo Financeiro
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-xl font-bold">{formatCurrency(stats?.financial.total.amount || 0)}</p>
              <p className="text-xs text-gray-400">{stats?.financial.total.count || 0} pagamentos</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-500">Pago</p>
              <p className="text-xl font-bold text-green-700">{formatCurrency(stats?.financial.paid.amount || 0)}</p>
              <p className="text-xs text-gray-400">{stats?.financial.paid.count || 0} pagamentos</p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-gray-500">Pendente</p>
              <p className="text-xl font-bold text-yellow-700">{formatCurrency(stats?.financial.pending.amount || 0)}</p>
              <p className="text-xs text-gray-400">{stats?.financial.pending.count || 0} pagamentos</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
