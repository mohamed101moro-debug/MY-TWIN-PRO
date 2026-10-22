import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { EventBus } from '../core/EventBus';
import { unifiedBrainBridge } from '../core/UnifiedBrainBridge';
import { capabilityResolver } from '../coordinators/CapabilityResolver';
import { economyEngine } from '../services/EconomyEngine';
import { sendMessage } from '../services/twinApi';
import { useRTL } from '../../lib/useRTL';
import { useAppTheme } from '../../engine/colors';
import { SPACE, RADIUS } from '../../src/design/tokens/spacing';
import { CheckSquare, Plus, Calendar, Clock, TrendingUp, Target, ListChecks, ChevronRight, Brain } from 'lucide-react-native';

interface Task {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  dueDate: string;
  createdAt: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#10B981',
};

export default function TaskManagerCapability() {
  const rtl = useRTL();
  const { colors } = useAppTheme();
  const [active, setActive] = useState(false);
  const [inputText, setInputText] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    const unsub1 = EventBus.on('CAPABILITY_ACTIVATED', (payload: any) => { if (payload?.capability === 'task_manager') { setActive(true); loadTaskContext(); } });
    const unsub2 = EventBus.on('CAPABILITY_DEACTIVATED', () => setActive(false));
    const unsub3 = EventBus.on('WORKSPACE_CHANGE_REQUESTED', (payload: any) => { if (payload?.workspace === 'task_manager') { setActive(true); loadTaskContext(); } else if (payload?.workspace === null && active) setActive(false); });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [active]);

  const loadTaskContext = async () => {
    try {
      const saved = await unifiedBrainBridge.getCapabilityMemory('task_manager', 10);
      if (saved.length > 0) {
        const restoredTasks: Task[] = saved.map((m: any) => ({
          id: m.id,
          title: (m.expressed_text || m.content || '').substring(0, 100),
          priority: (m.relatedTo?.find((r: string) => ['high', 'medium', 'low'].includes(r)) || 'medium') as Task['priority'],
          completed: m.relatedTo?.includes('completed'),
          dueDate: m.created_at || m.timestamp,
          createdAt: m.created_at || m.timestamp,
        }));
        setTasks(restoredTasks);
        setCompletedCount(restoredTasks.filter(t => t.completed).length);
      }
    } catch (e) {}
  };

  const addTask = async () => {
    if (!inputText.trim() || isProcessing) return;
    setIsProcessing(true);

    try {
      const result = await sendMessage(
        `${rtl.isRTL ? 'أنشئ مهمة:' : 'Create task:'} ${inputText.trim()}`,
        [],
        rtl.isRTL ? 'ar' : 'en'
      );
      const reply = result?.reply || (rtl.isRTL ? 'تم إنشاء المهمة.' : 'Task created.');

      const newTask: Task = {
        id: Date.now().toString(),
        title: inputText.trim(),
        priority: 'medium',
        completed: false,
        dueDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      setTasks(prev => [newTask, ...prev]);
      setLastResponse(reply);

      try {
        await unifiedBrainBridge.storeMemory('decision', inputText.trim(), 55, 'focused', ['task_manager', 'medium']);
      } catch (e) {}

      economyEngine.addPoints('goal', 5, 'إضافة مهمة جديدة');
    } catch (e) {
      setLastResponse(rtl.isRTL ? 'حدث خطأ.' : 'An error occurred.');
    } finally {
      setIsProcessing(false);
      setInputText('');
    }
  };

  const toggleTask = async (taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const updated = { ...t, completed: !t.completed };
        if (updated.completed) {
          economyEngine.addPoints('goal', 3, 'إكمال مهمة');
        }
        return updated;
      }
      return t;
    }));
    setCompletedCount(prev => tasks.find(t => t.id === taskId)?.completed ? prev - 1 : prev + 1);

    try {
      await unifiedBrainBridge.storeMemory('decision', `task_${taskId}_toggled`, 40, 'neutral', ['task_manager', 'completed']);
    } catch (e) {}
  };

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(async () => {
      try {
        const twinState = await unifiedBrainBridge.getTwinState();
        const emotion = twinState?.twin_emotional_state?.current_emotion || 'neutral';
        if (emotion === 'focused' || emotion === 'concerned') {
          EventBus.emit('TWIN_SPEAK', {
            phrase: rtl.isRTL ? 'هل أنجزت مهام اليوم؟' : 'Did you complete today\'s tasks?',
            tone: 'gentle',
          });
        }
      } catch (e) {}
    }, 8000);
    return () => clearTimeout(timer);
  }, [active]);

  const handleDeactivate = () => {
    EventBus.emit('CAPABILITY_DEACTIVATED', { capability: 'task_manager', timestamp: Date.now() });
    capabilityResolver.deactivate();
  };

  const filteredTasks = tasks.filter(t => {
    if (activeFilter === 'active') return !t.completed;
    if (activeFilter === 'completed') return t.completed;
    return true;
  });

  if (!active) return null;

  return (
    <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(300)} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconWrapLarge, { backgroundColor: colors.gold + '20' }]}>
            <CheckSquare size={24} stroke={colors.gold} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Task Manager</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{rtl.isRTL ? 'مدير المهام' : 'Task Manager'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={handleDeactivate}>
          <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <ListChecks size={16} stroke={colors.gold} />
            <Text style={[styles.statValue, { color: colors.text }]}>{tasks.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{rtl.isRTL ? 'مهام' : 'Tasks'}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <TrendingUp size={16} stroke={colors.success} />
            <Text style={[styles.statValue, { color: colors.text }]}>{completedCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{rtl.isRTL ? 'مكتملة' : 'Done'}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Target size={16} stroke={colors.accent} />
            <Text style={[styles.statValue, { color: colors.text }]}>{tasks.length - completedCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{rtl.isRTL ? 'متبقية' : 'Left'}</Text>
          </View>
        </View>

        <View style={[styles.canvasCard, { backgroundColor: colors.card, borderColor: colors.gold + '40' }]}>
          <View style={styles.canvasHeader}>
            <Plus size={16} stroke={colors.gold} />
            <Text style={[styles.canvasLabel, { color: colors.gold }]}>{rtl.isRTL ? 'مهمة جديدة' : 'New Task'}</Text>
          </View>
          <View style={styles.addRow}>
            <TextInput
              style={[styles.addInput, { textAlign: rtl.textAlign, backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder={rtl.isRTL ? 'ما الذي تريد إنجازه؟' : 'What do you want to accomplish?'}
              placeholderTextColor={colors.textSecondary}
              onSubmitEditing={addTask}
            />
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.gold }]} onPress={addTask} disabled={isProcessing}>
              <ChevronRight size={18} stroke="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.filterRow}>
          {(['all', 'active', 'completed'] as const).map(filter => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, { borderColor: colors.border }, activeFilter === filter && { backgroundColor: colors.gold + '20', borderColor: colors.gold }]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[styles.filterText, { color: colors.textSecondary }, activeFilter === filter && { color: colors.gold }]}>
                {filter === 'all' ? (rtl.isRTL ? 'الكل' : 'All') : filter === 'active' ? (rtl.isRTL ? 'نشطة' : 'Active') : (rtl.isRTL ? 'مكتملة' : 'Done')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredTasks.length > 0 ? (
          <View style={styles.tasksList}>
            {filteredTasks.map(task => (
              <TouchableOpacity
                key={task.id}
                style={[styles.taskItem, { backgroundColor: colors.card }, task.completed && styles.taskCompleted]}
                onPress={() => toggleTask(task.id)}
              >
                <View style={[styles.checkbox, { borderColor: colors.gold }, task.completed && { backgroundColor: colors.success, borderColor: colors.success }]}>
                  {task.completed && <CheckSquare size={14} stroke="#FFF" />}
                </View>
                <View style={styles.taskInfo}>
                  <Text style={[styles.taskTitle, { color: colors.text }, task.completed && styles.taskTitleDone]} numberOfLines={2}>
                    {task.title}
                  </Text>
                  <View style={styles.taskMeta}>
                    <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[task.priority] }]} />
                    <Text style={[styles.taskDate, { color: colors.textSecondary }]}>
                      {new Date(task.createdAt).toLocaleDateString(rtl.isRTL ? 'ar' : 'en')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {rtl.isRTL ? 'لا توجد مهام. أضف مهمتك الأولى!' : 'No tasks yet. Add your first task!'}
          </Text>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md, maxHeight: '75%' },
  scroll: { gap: SPACE.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACE.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  iconWrapLarge: { width: 48, height: 48, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSubtitle: { fontSize: 12 },
  closeBtn: { padding: 8, borderRadius: RADIUS.sm, backgroundColor: 'rgba(255,255,255,0.05)' },
  closeText: { fontSize: 16, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: SPACE.sm },
  statCard: { flex: 1, borderRadius: RADIUS.card, padding: SPACE.sm, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11 },
  canvasCard: { borderRadius: RADIUS.card, borderWidth: 1, padding: SPACE.md },
  canvasHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.sm },
  canvasLabel: { fontSize: 14, fontWeight: '600' },
  addRow: { flexDirection: 'row', gap: SPACE.sm },
  addInput: { flex: 1, borderRadius: RADIUS.sm, padding: 12, fontSize: 15, borderWidth: 1 },
  addBtn: { width: 44, height: 44, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  filterRow: { flexDirection: 'row', gap: SPACE.sm },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.sm, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: '600' },
  tasksList: { gap: SPACE.sm },
  taskItem: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, borderRadius: RADIUS.sm, padding: SPACE.sm },
  taskCompleted: { opacity: 0.6 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 14, fontWeight: '500' },
  taskTitleDone: { textDecorationLine: 'line-through' },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  taskDate: { fontSize: 11 },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: SPACE.lg },
});
