import { useEffect, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, ShoppingCart, Check, AlertCircle, Clock } from 'lucide-react';

interface Purchase {
  id: string;
  project_id: string;
  task_id: string;
  item: string;
  description: string;
  status: string;
  quotations: string;
  selected_quotation: number;
  created_at: string;
}

export default function Purchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showQuotationModal, setShowQuotationModal] = useState<Purchase | null>(null);
  const [newPurchase, setNewPurchase] = useState({
    item: '',
    description: '',
    projectId: ''
  });
  const [newQuotation, setNewQuotation] = useState({
    supplier: '',
    price: '',
    deadline: '',
    notes: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = filterStatus ? `?status=${filterStatus}` : '';
      const [purchasesRes, projectsRes] = await Promise.all([
        axios.get(`/api/purchases${params}`),
        axios.get('/api/projects')
      ]);
      setPurchases(purchasesRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const handleCreatePurchase = async () => {
    if (!newPurchase.item.trim()) return;

    try {
      await axios.post('/api/purchases', {
        projectId: newPurchase.projectId || null,
        item: newPurchase.item,
        description: newPurchase.description
      });

      setNewPurchase({ item: '', description: '', projectId: '' });
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('Failed to create purchase:', error);
    }
  };

  const handleAddQuotation = async () => {
    if (!showQuotationModal || !newQuotation.supplier || !newQuotation.price) return;

    try {
      await axios.post(`/api/purchases/${showQuotationModal.id}/quotations`, {
        supplier: newQuotation.supplier,
        price: parseFloat(newQuotation.price),
        deadline: newQuotation.deadline,
        notes: newQuotation.notes
      });

      setNewQuotation({ supplier: '', price: '', deadline: '', notes: '' });
      setShowQuotationModal(null);
      fetchData();
    } catch (error) {
      console.error('Failed to add quotation:', error);
    }
  };

  const handleSelectQuotation = async (purchaseId: string, index: number) => {
    try {
      await axios.post(`/api/purchases/${purchaseId}/select`, { quotationIndex: index });
      setShowQuotationModal(null);
      fetchData();
    } catch (error) {
      console.error('Failed to select quotation:', error);
    }
  };

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    pending_quotations: { label: 'Aguardando Cotações', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    ready_for_comparison: { label: 'Pronto para Comparação', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
    selected: { label: 'Selecionado', color: 'bg-green-100 text-green-700', icon: Check },
    completed: { label: 'Concluído', color: 'bg-gray-100 text-gray-700', icon: Check }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Compras</h1>
          <p className="text-gray-500">Gestão de cotações (mínimo 3)</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" />
          Nova Compra
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {Object.entries(statusConfig).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
            className={`px-3 py-1.5 text-sm rounded-lg border ${
              filterStatus === key ? config.color + ' border-current' : 'bg-white hover:bg-gray-50'
            }`}
          >
            {config.label}
          </button>
        ))}
      </div>

      {/* Purchases list */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-400">Carregando...</div>
        ) : purchases.length === 0 ? (
          <div className="text-center py-8 text-gray-400">Nenhuma compra cadastrada</div>
        ) : (
          purchases.map((purchase) => {
            const config = statusConfig[purchase.status] || statusConfig.pending_quotations;
            const quotations = JSON.parse(purchase.quotations || '[]');
            const Icon = config.icon;

            return (
              <div key={purchase.id} className="bg-white rounded-lg border p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-primary-600" />
                    <h3 className="font-bold">{purchase.item}</h3>
                  </div>
                  <span className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded ${config.color}`}>
                    <Icon className="w-3 h-3" />
                    {config.label}
                  </span>
                </div>

                {purchase.description && (
                  <p className="text-sm text-gray-500 mb-3">{purchase.description}</p>
                )}

                {/* Quotations */}
                {quotations.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-medium mb-2">Cotações ({quotations.length}/3):</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {quotations.map((q: any, index: number) => (
                        <div
                          key={index}
                          className={`p-2 rounded border text-sm ${
                            purchase.selected_quotation === index ? 'border-green-500 bg-green-50' : 'bg-gray-50'
                          }`}
                        >
                          <div className="font-medium">{q.supplier}</div>
                          <div className="text-primary-600 font-bold">{formatCurrency(q.price)}</div>
                          {q.deadline && (
                            <div className="text-xs text-gray-400">{q.deadline}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {purchase.status === 'pending_quotations' && quotations.length < 3 && (
                    <button
                      onClick={() => setShowQuotationModal(purchase)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar Cotação
                    </button>
                  )}
                  {purchase.status === 'ready_for_comparison' && (
                    <button
                      onClick={() => setShowQuotationModal(purchase)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                    >
                      <Check className="w-4 h-4" />
                      Selecionar Cotação
                    </button>
                  )}
                </div>

                <p className="text-xs text-gray-400 mt-2">
                  Criado em {format(new Date(purchase.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Create purchase modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Nova Compra</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Item *</label>
                <input
                  type="text"
                  value={newPurchase.item}
                  onChange={(e) => setNewPurchase({ ...newPurchase, item: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descrição</label>
                <textarea
                  value={newPurchase.description}
                  onChange={(e) => setNewPurchase({ ...newPurchase, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Projeto</label>
                <select
                  value={newPurchase.projectId}
                  onChange={(e) => setNewPurchase({ ...newPurchase, projectId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Selecione um projeto</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={handleCreatePurchase}
                disabled={!newPurchase.item.trim()}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quotation modal */}
      {showQuotationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">
              {showQuotationModal.status === 'ready_for_comparison' ? 'Selecionar Cotação' : 'Adicionar Cotação'}
            </h2>

            {showQuotationModal.status === 'ready_for_comparison' ? (
              <div className="space-y-2">
                {JSON.parse(showQuotationModal.quotations || '[]').map((q: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => handleSelectQuotation(showQuotationModal.id, index)}
                    className="w-full p-3 border rounded-lg hover:bg-gray-50 text-left"
                  >
                    <div className="font-medium">{q.supplier}</div>
                    <div className="text-primary-600 font-bold">{formatCurrency(q.price)}</div>
                    {q.deadline && <div className="text-xs text-gray-400">Prazo: {q.deadline}</div>}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Fornecedor *</label>
                  <input
                    type="text"
                    value={newQuotation.supplier}
                    onChange={(e) => setNewQuotation({ ...newQuotation, supplier: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Preço *</label>
                  <input
                    type="number"
                    value={newQuotation.price}
                    onChange={(e) => setNewQuotation({ ...newQuotation, price: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Prazo de Entrega</label>
                  <input
                    type="text"
                    value={newQuotation.deadline}
                    onChange={(e) => setNewQuotation({ ...newQuotation, deadline: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Ex: 5 dias úteis"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Observações</label>
                  <textarea
                    value={newQuotation.notes}
                    onChange={(e) => setNewQuotation({ ...newQuotation, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={2}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowQuotationModal(null)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              {showQuotationModal.status !== 'ready_for_comparison' && (
                <button
                  onClick={handleAddQuotation}
                  disabled={!newQuotation.supplier || !newQuotation.price}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  Adicionar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
