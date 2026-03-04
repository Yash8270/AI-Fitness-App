import { Utensils, Target } from 'lucide-react';
import React from 'react';

export const PROGRESS_DATA = [
  { day: 'Mon', protein: 140, calories: 2100, targetP: 160, targetC: 2500 },
  { day: 'Tue', protein: 155, calories: 2400, targetP: 160, targetC: 2500 },
  { day: 'Wed', protein: 130, calories: 1900, targetP: 160, targetC: 2500 },
  { day: 'Thu', protein: 165, calories: 2600, targetP: 160, targetC: 2500 },
  { day: 'Fri', protein: 160, calories: 2550, targetP: 160, targetC: 2500 },
  { day: 'Sat', protein: 120, calories: 2800, targetP: 160, targetC: 2500 },
  { day: 'Sun', protein: 145, calories: 2200, targetP: 160, targetC: 2500 },
];

export const VITAMIN_DATA = [
  { name: 'Calcium', value: 80, fill: '#8b5cf6' }, // Indigo
  { name: 'Iron', value: 65, fill: '#10b981' },    // Emerald
  { name: 'Vit D', value: 45, fill: '#f59e0b' },   // Amber
  { name: 'Zinc', value: 90, fill: '#ef4444' },    // Red
];

export const HISTORY_LOGS = [
  {
    id: 1, date: 'Oct 24, 2023', protein: 155, calories: 2450, score: 92,
    meals: [
      { name: 'Oatmeal & Whey', cal: 450, pro: 35 },
      { name: 'Chicken Salad', cal: 600, pro: 45 },
      { name: 'Steak & Rice', cal: 800, pro: 55 },
      { name: 'Yogurt', cal: 200, pro: 20 },
    ]
  },
  {
    id: 2, date: 'Oct 23, 2023', protein: 130, calories: 2100, score: 78,
    meals: [
      { name: 'Toast & Eggs', cal: 500, pro: 25 },
      { name: 'Tuna Sandwich', cal: 450, pro: 30 },
      { name: 'Pasta', cal: 900, pro: 25 },
    ]
  },
  {
    id: 3, date: 'Oct 22, 2023', protein: 170, calories: 2800, score: 98,
    meals: [
      { name: 'Protein Pancakes', cal: 600, pro: 40 },
      { name: 'Beef Bowl', cal: 800, pro: 50 },
      { name: 'Salmon', cal: 700, pro: 45 },
      { name: 'Casein Shake', cal: 150, pro: 25 },
    ]
  }
];

export const AI_ACTIONS = [
  {
    id: 'normal-diet-plan',
    title: 'Generate a normal diet plan',
    type: 'GENERATE_DIET_PLAN',
    icon: <Utensils />,
    color: 'bg-indigo-600',
  },
  {
    id: 'target-gym',
    title: 'Set my daily nutrition target (Gym)',
    type: 'SET_TARGET_GYM',
    icon: <Target />,
    color: 'bg-emerald-600',
  },
  {
    id: 'target-no-gym',
    title: 'Set my daily nutrition target (No Gym)',
    type: 'SET_TARGET_NO_GYM',
    icon: <Target />,
    color: 'bg-sky-600',
  },

];