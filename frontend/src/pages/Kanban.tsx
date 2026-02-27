import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus,
  User,
  Calendar
} from 'lucide-react';

interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string;
  column: 'new' | 'allocated' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assigned_agent: string;
  due_date: string;
  created_at: string;
  project_name?: string;
}

interface Project {
  id: string;
  name: string;
}

const columns = [
  { id: 'new', label: 'Novos', color: 'bg-gray-100' },
  { id: 'allocated', label: 'Alocados', color: 'bg-blue-50' },
  { id: 'in_progress', label: 'Em Andamento', color: 'bg-yellow-50' },
  { id: 'completed', label: 'Concluídos', color: 'bg-green-50' }
];

const priorityColors = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700'
};

const priorityLabels = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta'
};

export default function Kanban() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    dueDate: '',
    projectId: ''
  });
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const dragOverColumn = useRef<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        axios.get('/api/tasks'),
        axios.get('/api/projects')
      ]);
      setTasks(tasksRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return;

    try {
      await axios.post('/api/tasks', {
        projectId: newTask.projectId || null,
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        dueDate: newTask.dueDate || null
      });

      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: '',
        projectId: ''
      });
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    dragOverColumn.current = columnId;
  };

  const handleDrop = async (columnId: string) => {
    if (!draggedTask) return;

    try {
      await axios.put(`/api/tasks/${draggedTask.id}`, {
        column: columnId
      });

      setTasks(tasks.map(t =>
        t.id === draggedTask.id ? { ...t, column: columnId as any } : t
      ));
    } catch (error) {
      console.error('Failed to move task:', error);
    } finally {
      setDraggedTask(null);
    }
  };

  const getTasksByColumn = (columnId: string) => {
    let filtered = tasks.filter(t => t.column === columnId);
    if (selectedProject) {
      filtered = filtered.filter(t => t.project_id === selectedProject);
    }
    return filtered;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Centro de Controle</h1>
          <p className="text-gray-500">Gestão de tarefas em Kanban</p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos os projetos</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            Nova Tarefa
          </button>
        </div>
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((column) => (
          <div
            key={column.id}
            className={`${column.color} rounded-lg p-3 min-h-[400px]`}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDrop={() => handleDrop(column.id)}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">{column.label}</h3>
              <span className="text-sm text-gray-500 bg-white px-2 py-0.5 rounded">
                {getTasksByColumn(column.id).length}
              </span>
            </div>

            <div className="space-y-2">
              {loading ? (
                <div className="text-center py-4 text-gray-400 text-sm">Carregando...</div>
              ) : getTasksByColumn(column.id).length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-sm">Nenhuma tarefa</div>
              ) : (
                getTasksByColumn(column.id).map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task)}
                    className="bg-white rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className={`px-2 py-0.5 text-xs rounded ${priorityColors[task.priority]}`}>
                        {priorityLabels[task.priority]}
                      </span>
                      {task.due_date && (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(task.due_date), 'dd/MM', { locale: ptBR })}
                        </div>
                      )}
                    </div>
                    <h4 className="font-medium mb-1">{task.title}</h4>
                    {task.description && (
                      <p className="text-sm text-gray-500 line-clamp-2">{task.description}</p>
                    )}
                    {task.assigned_agent && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                        <User className="w-3 h-3" />
                        {task.assigned_agent}
                      </div>
                    )}
                    {task.project_name && (
                      <div className="mt-2">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {task.project_name}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create task modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Nova Tarefa</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Título *</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Ex: Pagamento de Bolsas - Mês 01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Descrição</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Projeto</label>
                <select
                  value={newTask.projectId}
                  onChange={(e) => setNewTask({ ...newTask, projectId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Selecione um projeto</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Prioridade</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Data de Entrega</label>
                <input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateTask}
                disabled={!newTask.title.trim()}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                Criar Tarefa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
