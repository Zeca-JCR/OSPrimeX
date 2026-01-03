# Regras de Desenvolvimento Proativo - OSPrimeX

## Filosofia Geral
Ao implementar qualquer funcionalidade, não faça apenas o mínimo. Pense como um desenvolvedor senior que entrega valor completo.

## Checklist de Proatividade

Ao implementar uma feature, sempre considere:

### 1. **Feedback Visual**
- [ ] Toast/notificação de sucesso/erro
- [ ] Loading states durante operações
- [ ] Animações de transição suaves
- [ ] Estados vazios (empty states) bem desenhados

### 2. **Sincronização**
- [ ] Storage event para sync entre abas
- [ ] Polling como fallback
- [ ] Notificações push quando relevante

### 3. **UX Completa**
- [ ] Confirmação antes de ações destrutivas
- [ ] Undo quando possível
- [ ] Atalhos de teclado para ações frequentes
- [ ] Responsividade mobile

### 4. **Integração com Sistema**
- [ ] Notificação no sino do header quando relevante
- [ ] Atualização automática de dashboards/listas
- [ ] Registro em histórico/observações quando apropriado

### 5. **Casos de Borda**
- [ ] O que acontece se dados estão incompletos?
- [ ] E se o usuário cancelar no meio?
- [ ] E se houver conflito de dados?

## Por Status/Fluxo

### Orçamentos
- Exibir valor total de forma destacada
- Mostrar validade implícita (sugerir 7 dias)
- Link fácil para cliente acessar
- Notificar oficina quando aprovado

### Ordens de Serviço
- Timeline visual de status
- Estimativa de tempo quando possível
- Notificar transições importantes

### Financeiro
- Sempre mostrar saldos atualizados
- Alertas visuais para pendências
- Comissões calculadas automaticamente

## Ao Receber um Pedido

1. Primeiro, implementar o que foi pedido
2. Durante a implementação, identificar oportunidades óbvias de melhoria
3. Implementar melhorias relacionadas sem perguntar (desde que não mude o escopo)
4. Mencionar no final o que foi adicionado além do pedido original

## Princípios

- **Não reinventar** - Se algo já existe no sistema, reutilizar
- **Consistência** - Usar mesmos padrões visuais e de código
- **Completude** - Funcionalidade parcial não é funcionalidade
- **Documentar pelo código** - Comentários claros, nomes descritivos
