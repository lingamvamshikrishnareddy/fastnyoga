import React, { useState } from 'react';
import { ChevronDown, Play, Image } from 'lucide-react';

const YogaExercises = () => {
  const [openCategory, setOpenCategory] = useState(null);
  const yogaCategories = [
    {
      name: "Brain Health",
      description: "Exercises to enhance cognitive function and mental clarity",
      exercises: [
        {
          name: "Bhramari Pranayama (Humming Bee Breathing)",
          duration: "5-10 minutes",
          description: "Calms the mind, releases negative emotions, improves concentration and memory, builds confidence.",
          benefits: ["Improved concentration", "Stress relief", "Better memory", "Emotional balance"]
        },
        {
          name: "Paschimottanasana (Seated Forward Bend)",
          duration: "1-3 minutes",
          description: "Stretches the spine, helps relieve stress, and relaxes the mind.",
          benefits: ["Spine flexibility", "Mental relaxation", "Stress reduction"]
        },
        {
          name: "Halasana (Plow Pose)",
          duration: "1-5 minutes",
          description: "Improves blood flow to the brain, stretches the back and neck, reduces stress and fatigue.",
          benefits: ["Improved blood flow", "Stress reduction", "Neck and back stretch"]
        },
        {
          name: "Setu Bandhasana (Bridge Pose)",
          duration: "1-3 minutes",
          description: "Strengthens and stretches the neck and spine, calms the brain, reduces anxiety, stress, and depression.",
          benefits: ["Spine and neck strength", "Anxiety reduction", "Stress relief"]
        },
        {
          name: "Sarvangasana (Shoulder Stand)",
          duration: "3-5 minutes",
          description: "Regulates thyroid and parathyroid glands, nourishes the brain, and improves cognitive functions.",
          benefits: ["Thyroid regulation", "Brain nourishment", "Cognitive improvement"]
        },
        {
          name: "Super Brain Yoga",
          duration: "1-3 minutes",
          description: "Increases brain power, synchronizes left and right brain, stimulates thinking capacity, improves focus, concentration, and memory.",
          benefits: ["Increased brain power", "Improved focus", "Better memory"]
        },
      ]
    },
    {
      name: "Back Pain Relief",
      description: "Gentle poses to alleviate back pain and improve posture",
      exercises: [
        {
          name: "Lengthening the Spine",
          duration: "30 seconds",
          description: "Lifts arms, interlaces fingers, stretches up, and holds posture.",
          benefits: ["Improved posture", "Spine alignment", "Pain relief"]
        },
        {
          name: "Twisting the Spine",
          duration: "30 seconds each side",
          description: "Twists to the right and left, holds each position.",
          benefits: ["Spine flexibility", "Pain relief", "Improved mobility"]
        },
        {
          name: "Bending the Spine",
          duration: "30 seconds each direction",
          description: "Bends to the right and left, stretches forward and backward.",
          benefits: ["Spine flexibility", "Pain relief", "Improved mobility"]
        },
        {
          name: "Side-to-Side Twisting",
          duration: "30 seconds each side",
          description: "Twists to each side while keeping one hand on the opposite knee.",
          benefits: ["Spine flexibility", "Pain relief", "Improved mobility"]
        },
      ]
    },
    {
      name: "Boosting Metabolism",
      description: "Poses to enhance metabolic rate and improve digestion",
      exercises: [
        {
          name: "Kapal Bhati Pranayama",
          duration: "5-10 minutes",
          description: "Boosts metabolic rate, stimulates abdominal organs, improves digestion, and trims the belly.",
          benefits: ["Improved metabolism", "Better digestion", "Belly trimming"]
        },
        {
          name: "Eka Pada Raja Kapotasana",
          duration: "30-60 seconds each side",
          description: "Stimulates abdominal organs, enhances digestion, improves blood circulation.",
          benefits: ["Improved digestion", "Better blood circulation", "Abdominal stimulation"]
        },
        {
          name: "Utkatasana",
          duration: "30-60 seconds",
          description: "Tones thighs, knees, and legs, improves body posture.",
          benefits: ["Toned legs", "Improved posture", "Thigh and knee strength"]
        },
        {
          name: "Ustrasana",
          duration: "30-60 seconds",
          description: "Enhances digestion, strengthens the lower back, and tones abdominal organs.",
          benefits: ["Improved digestion", "Lower back strength", "Abdominal toning"]
        },
      ]
    },
    {
      name: "Fertility",
      description: "Poses to enhance fertility and reproductive health",
      exercises: [
        {
          name: "Nadi Shodhan Pranayama (Alternate Nostril Breathing)",
          duration: "5-10 minutes",
          description: "Calms the mind and body, purifies energy channels.",
          benefits: ["Mind and body calmness", "Energy purification", "Stress relief"]
        },
        {
          name: "Bhramari Pranayama (Bee Breath)",
          duration: "5-10 minutes",
          description: "Relieves tension, anger, and anxiety.",
          benefits: ["Tension relief", "Anxiety reduction", "Emotional balance"]
        },
        {
          name: "Paschimottanasana (Seated Forward Bend)",
          duration: "1-3 minutes",
          description: "Stimulates uterus and ovaries, relieves stress and depression.",
          benefits: ["Uterus and ovary stimulation", "Stress relief", "Depression reduction"]
        },
        {
          name: "Hastapadasana (Standing Forward Bend)",
          duration: "1-3 minutes",
          description: "Stretches muscles, improves blood supply to the pelvic region.",
          benefits: ["Muscle stretch", "Improved blood supply", "Pelvic health"]
        },
        {
          name: "Janu Shirasana (One-legged Forward Bend)",
          duration: "1-3 minutes each side",
          description: "Strengthens back muscles.",
          benefits: ["Back muscle strength", "Flexibility", "Spine health"]
        },
        {
          name: "Badhakonasana (Butterfly Pose)",
          duration: "1-3 minutes",
          description: "Stretches inner thighs and groins, ensures smooth delivery.",
          benefits: ["Inner thigh stretch", "Groin stretch", "Smooth delivery"]
        },
        {
          name: "Viparita Karani (Legs Up the Wall Pose)",
          duration: "5-10 minutes",
          description: "Relieves tired legs, backache, improves blood flow to the pelvic region.",
          benefits: ["Leg relief", "Backache relief", "Improved blood flow"]
        },
        {
          name: "Yoga Nidra (Yogic Sleep)",
          duration: "15-30 minutes",
          description: "Attains equilibrium, reduces stress, prepares mind and body for conception.",
          benefits: ["Equilibrium", "Stress reduction", "Conception preparation"]
        },
      ]
    },
    {
      name: "Arthritis Relief",
      description: "Poses to alleviate arthritis pain and improve joint health",
      exercises: [
        {
          name: "Veerbhadrasana (Warrior Pose)",
          duration: "30-60 seconds each side",
          description: "Strengthens arms, legs, and lower back, beneficial for frozen shoulders.",
          benefits: ["Arm and leg strength", "Lower back strength", "Shoulder health"]
        },
        {
          name: "Vrikshasana (Tree Pose)",
          duration: "30-60 seconds each side",
          description: "Strengthens legs and back, improves balance.",
          benefits: ["Leg and back strength", "Improved balance", "Joint health"]
        },
        {
          name: "Marjariasana (Cat Stretch)",
          duration: "1-3 minutes",
          description: "Brings flexibility, strength to the spine, wrists, and shoulders.",
          benefits: ["Spine flexibility", "Wrist and shoulder strength", "Joint health"]
        },
        {
          name: "Setubandhasana (Bridge Pose)",
          duration: "30-60 seconds",
          description: "Strengthens back muscles, stretches neck, chest, and spine.",
          benefits: ["Back muscle strength", "Neck and chest stretch", "Spine health"]
        },
        {
          name: "Trikonasana (Triangle Pose)",
          duration: "30-60 seconds each side",
          description: "Effective for back pain and sciatica, stretches and strengthens the spine.",
          benefits: ["Back pain relief", "Sciatica relief", "Spine strength"]
        },
        {
          name: "Shavasana (Corpse Pose)",
          duration: "5-10 minutes",
          description: "Complete relaxation, repairs tissues and cells, releases stress.",
          benefits: ["Complete relaxation", "Stress relief", "Cell repair"]
        },
      ]
    },
    {
      name: "Shoulder Pain",
      description: "Poses to alleviate shoulder pain and improve shoulder health",
      exercises: [
        {
          name: "Garudasana (Eagle Pose)",
          duration: "30-60 seconds each side",
          description: "Stretches shoulders and upper back.",
          benefits: ["Shoulder stretch", "Upper back stretch", "Joint health"]
        },
        {
          name: "Paschim Namaskarasana (Reverse Prayer Pose)",
          duration: "30-60 seconds",
          description: "Stretches shoulder joints and pectoral muscles.",
          benefits: ["Shoulder joint stretch", "Pectoral muscle stretch", "Joint health"]
        },
        {
          name: "Ustrasana (Camel Pose)",
          duration: "30-60 seconds",
          description: "Stretches and strengthens the front of the body, relieves lower backache.",
          benefits: ["Front body stretch", "Lower backache relief", "Body strength"]
        },
        {
          name: "Dhanurasana (Bow Pose)",
          duration: "30-60 seconds",
          description: "Opens the chest, neck, and shoulders, reduces stress and fatigue.",
          benefits: ["Chest and shoulder opening", "Stress reduction", "Fatigue relief"]
        },
        {
          name: "Purvottanasana (Upward Plank Pose)",
          duration: "30-60 seconds",
          description: "Stretches shoulders, chest, and neck, strengthens shoulders and back.",
          benefits: ["Shoulder and chest stretch", "Back strength", "Joint health"]
        },
      ]
    },
    {
      name: "Irritable Bowel Syndrome (IBS)",
      description: "Poses to alleviate IBS symptoms and improve digestive health",
      exercises: [
        {
          name: "Bhramari Pranayama (Bee Breath)",
          duration: "5-10 minutes",
          description: "Relieves stress and tension.",
          benefits: ["Stress relief", "Tension relief", "Emotional balance"]
        },
        {
          name: "Paschimottanasana (Seated Forward Bend)",
          duration: "1-3 minutes",
          description: "Stimulates digestive organs.",
          benefits: ["Digestive stimulation", "Abdominal health", "Stress relief"]
        },
        {
          name: "Setubandhasana (Bridge Pose)",
          duration: "30-60 seconds",
          description: "Strengthens the back, stretches the stomach.",
          benefits: ["Back strength", "Stomach stretch", "Digestive health"]
        },
        {
          name: "Shavasana (Corpse Pose)",
          duration: "5-10 minutes",
          description: "Relaxes the entire body, aids in stress relief.",
          benefits: ["Complete relaxation", "Stress relief", "Body relaxation"]
        },
      ]
    },
  ];

  const toggleCategory = (index) => {
    setOpenCategory(openCategory === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
          Yoga Exercises for Health & Wellness
        </h1>
        <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
          Discover a collection of yoga poses designed to enhance your physical and mental well-being
        </p>

        <div className="space-y-8">
          {yogaCategories.map((category, index) => (
            <div 
              key={index} 
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
            >
              <button
                onClick={() => toggleCategory(index)}
                className="w-full px-8 py-6 flex justify-between items-center hover:bg-gray-50/50 transition-colors duration-300"
              >
                <div className="flex-1">
                  <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 tracking-tight">
                    {category.name}
                  </h2>
                  <p className="text-gray-600 mt-2 leading-relaxed">
                    {category.description}
                  </p>
                </div>
                <ChevronDown
                  className={`w-6 h-6 text-gray-500 transform transition-transform duration-300 ease-in-out ml-4 flex-shrink-0 ${
                    openCategory === index ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {openCategory === index && (
                <div className="p-8 border-t border-gray-100">
                  <div className="grid gap-8">
                    {category.exercises.map((exercise, exerciseIndex) => (
                      <div
                        key={exerciseIndex}
                        className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden"
                      >
                        <div className="grid md:grid-cols-2 gap-8 p-6">
                          <div className="space-y-6">
                            <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl aspect-video flex items-center justify-center overflow-hidden group">
                              <Image className="w-16 h-16 text-gray-400 group-hover:scale-110 transition-transform duration-300" />
                            </div>

                            <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl aspect-video flex items-center justify-center overflow-hidden group cursor-pointer">
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                              <Play className="w-16 h-16 text-gray-400 group-hover:text-gray-600 group-hover:scale-110 transition-all duration-300" />
                            </div>
                          </div>

                          <div className="space-y-6">
                            <h3 className="text-2xl font-semibold text-gray-800 tracking-tight">
                              {exercise.name}
                            </h3>

                            <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-full">
                              <span className="font-medium">Duration:</span>
                              <span className="ml-2">{exercise.duration}</span>
                            </div>

                            <p className="text-gray-600 leading-relaxed">
                              {exercise.description}
                            </p>

                            {exercise.benefits && (
                              <div className="space-y-4">
                                <h4 className="font-semibold text-gray-700">Benefits:</h4>
                                <ul className="grid gap-3">
                                  {exercise.benefits.map((benefit, i) => (
                                    <li 
                                      key={i} 
                                      className="flex items-center text-gray-600 bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors duration-200"
                                    >
                                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3" />
                                      {benefit}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default YogaExercises;