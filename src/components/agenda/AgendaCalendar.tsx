// @ts-nocheck
// Tipagem completa será adicionada em fase futura
import { useState, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import ptBR from 'date-fns/locale/pt-BR';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

// Configuração do localizer (pt-BR)
const locales = {
    'pt-BR': ptBR,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

const DnDCalendar = withDragAndDrop(Calendar);

const AgendaCalendar = ({ events, view, onView, onEventDrop, onEventClick, onSlotSelect, resources, resourceTitleAccessor }) => {
    // view e onView agora vêm via props do pai (Agenda) para persistência
    const [date, setDate] = useState(new Date());

    // Customização de estilos de eventos
    const eventPropGetter = useCallback((event) => {
        let className = 'bg-primary text-white border-0';

        // Verificar se é passado
        const isPast = new Date(event.end) < new Date();

        switch (event.status) {
            case 'confirmado':
                className = 'bg-green-500 text-white';
                break;
            case 'cancelado':
                className = 'bg-red-500 text-white opacity-60';
                break;
            case 'concluido':
                className = 'bg-gray-500 text-white';
                break;
            case 'bloqueio':
                className = 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800';
                break;
            default:
                className = 'bg-blue-500 text-white';
        }

        // Aplica estilo visual para eventos passados (Google Calendar Style)
        if (isPast && event.status !== 'cancelado' && event.status !== 'concluido') {
            className += ' opacity-50 contrast-75 saturate-50';
        }

        if (event.type === 'os') {
            // Estilo base para OSs na Agenda (Topo do dia)
            className = 'bg-slate-100 text-slate-700 border-l-4 border-slate-500 text-xs shadow-sm dark:bg-slate-800 dark:text-slate-300 dark:border-slate-500';

            // Variação sutis por status da OS
            if (event.status === 'em_andamento' || event.status === 'aprovada') {
                className = 'bg-blue-50 text-blue-800 border-l-4 border-blue-600 shadow-sm dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-500';
            } else if (event.status === 'aguardando_peca' || event.status === 'aguardando_aprovacao') {
                className = 'bg-amber-50 text-amber-800 border-l-4 border-amber-500 shadow-sm dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-500';
            } else if (event.status === 'finalizada' || event.status === 'pronto') {
                className = 'bg-green-50 text-green-800 border-l-4 border-green-600 shadow-sm dark:bg-green-900/40 dark:text-green-200 dark:border-green-500 decoration-dashed';
            }

            return { className };
        }

        return { className };
    }, []);

    const messages = useMemo(() => ({
        allDay: 'Dia Inteiro',
        previous: 'Anterior',
        next: 'Próximo',
        today: 'Hoje',
        month: 'Mês',
        week: 'Semana',
        day: 'Dia',
        agenda: 'Agenda',
        date: 'Data',
        time: 'Hora',
        event: 'Evento',
        noEventsInRange: 'Sem agendamentos neste período.',
    }), []);

    return (
        <div className="h-[calc(100vh-200px)] bg-white dark:bg-gray-900 rounded-xl shadow-sm p-4">
            <DnDCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}

                // Navegação e Views
                view={view}
                onView={onView}
                date={date}
                onNavigate={setDate}
                views={['month', 'week', 'day', 'agenda']}

                // Drag & Drop
                onEventDrop={onEventDrop}
                resizable={false} // Simplificar MVP sem resize por enquanto

                // Interações
                selectable
                onSelectSlot={onSlotSelect}
                onSelectEvent={onEventClick}

                // Customização

                eventPropGetter={eventPropGetter}
                messages={messages}
                culture="pt-BR"

                // Configurações de Horário
                min={new Date(0, 0, 0, 7, 0, 0)} // Início 07:00
                max={new Date(0, 0, 0, 19, 0, 0)} // Fim 19:00
                step={30}
                timeslots={2}
            />
        </div>
    );
};

export default AgendaCalendar;

