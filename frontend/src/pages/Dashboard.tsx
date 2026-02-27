import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Activity
} from 'lucide-react';

interface TaskStats {
  new: number;
  allocated: number;
  in_progress: number;
  completed: number;
}

interface PaymentStats {
  total: number;
  paid: number;
  pending: number;
}

interface RiskStats {
  active: number;
  resolved: number;
  high: number;
  medium: number;
  low: number;
}

export default function Dashboard() {
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null);
  const [riskStats, setRiskStats] = useState<RiskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState<string>('');
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, paymentsRes, risksRes, projectsRes] = await Promise.all([
        axios.get(`/api/tasks?projectId=${projectId}`),
        axios.get(`/api/payments/stats?projectId=${projectId}`),
        axios.get(`/api/risks/stats?projectId=${projectId}`),
        axios.get('/api/projects')
      ]);

      // Calcular estatísticas de tarefas
      const tasks = tasksRes.data || [];
      const taskStats: TaskStats = {
        new: tasks.filter((t: any) => t.kanban_column === 'new').length,
        allocated: tasks.filter((t: any) => t.kanban_column === 'allocated').length,
        in_progress: tasks.filter((t: any) => t.kanban_column === 'in_progress').length,
        completed: tasks.filter((t: any) => t.kanban_column === 'completed').length
      };
      setTaskStats(taskStats);

      setPaymentStats(paymentsRes.data || { total: 0, paid: 0, pending: 0 });
      setRiskStats(risksRes.data || { active: 0, resolved: 0, high: 0, medium: 0, low: 0 });
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
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Carregando dashboard...</div>
      </div>
    );
  }

  const totalTasks = taskStats ? taskStats.new + taskStats.allocated + taskStats.in_progress + taskStats.completed : 0;
  const totalRisks = riskStats ? riskStats.high + riskStats.medium + riskStats.low : 0;

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
              <p className="text-2xl font-bold">{totalTasks}</p>
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
              <p className="text-2xl font-bold">{formatCurrency(paymentStats?.paid || 0)}</p>
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
              <p className="text-2xl font-bold">{formatCurrency(paymentStats?.pending || 0)}</p>
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
              <p className="text-2xl font-bold">{riskStats?.active || 0}</p>
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
            Tarefas por Status
          </h3>
          <div className="space-y-3">
            {taskStats && Object.entries(taskStats).map(([column, count]) => {
              const labels: Record<string, string> = {
                new: 'Novos',
                allocated: 'Alocados',
                in_progress: 'Em Andamento',
                completed: 'Concluídos'
              };
              const colors: Record<string, string> = {
                new: 'bg-gray-400',
                allocated: 'bg-blue-500',
                in_progress: 'bg-yellow-500',
                completed: 'bg-green-500'
              };
              return (
                <div key={column} className="flex items-center justify-between">
                  <span>{labels[column] || column}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${colors[column] || 'bg-gray-400'}`}
                        style={{ width: `${totalTasks > 0 ? (count / totalTasks) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Risks by severity */}
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Riscos por Severidade
          </h3>
          <div className="space-y-3">
            {riskStats && (
              <>
                {['high', 'medium', 'low'].map((severity) => {
                  const count = riskStats[severity as keyof RiskStats] || 0;
                  const labels: Record<string, string> = {
                    high: 'Alta',
                    medium: 'Média',
                    low: 'Baixa'
                  };
                  const colors: Record<string, string> = {
                    high: 'bg-red-500',
                    medium: 'bg-yellow-500',
                    low: 'bg-green-500'
                  };
                  return (
                    <div key={severity} className="flex items-center justify-between">
                      <span>{labels[severity]}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${colors[severity]}`}
                            style={{ width: `${totalRisks > 0 ? (count / totalRisks) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
