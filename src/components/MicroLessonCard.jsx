import React from 'react';

export default function MicroLessonCard({ lesson }) {
  return (
    <div className="p-3 border rounded">
      <div className="font-semibold">{lesson.title}</div>
      <div className="text-sm mt-1">{lesson.tip}</div>
      <div className="text-xs mt-2 text-gray-600">Practice: {lesson.practice_task}</div>
      <div className="text-xs text-gray-500">Example: {lesson.example_output}</div>
    </div>
  );
}
