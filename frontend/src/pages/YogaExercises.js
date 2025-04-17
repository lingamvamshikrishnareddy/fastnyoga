import React, { useState, useEffect } from 'react';
import { Play, Heart, Clock, Award } from 'lucide-react';

const YogaExercises = () => {
  const [openCategory, setOpenCategory] = useState(null);
  const [activeVideos, setActiveVideos] = useState({});
  const [likedExercises, setLikedExercises] = useState({});
  
  // Load liked exercises from localStorage on component mount
  useEffect(() => {
    const savedLikes = localStorage.getItem('yogaLikedExercises');
    if (savedLikes) {
      setLikedExercises(JSON.parse(savedLikes));
    }
  }, []);

  // Save liked exercises to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('yogaLikedExercises', JSON.stringify(likedExercises));
  }, [likedExercises]);

  const toggleLike = (exerciseName) => {
    setLikedExercises(prev => ({
      ...prev,
      [exerciseName]: !prev[exerciseName]
    }));
  };
  
  const yogaCategories = [
    {
      name: "Brain Health",
      coverImage: "/brain-icon.png",
      description: "Exercises to enhance cognitive function and mental clarity",
      exercises: [
        {
          name: "Bhramari Pranayama (Humming Bee Breathing)",
          duration: "5-10 minutes",
          difficulty: "Beginner",
          description: "Calms the mind, releases negative emotions, improves concentration and memory, builds confidence.",
          benefits: ["Improved concentration", "Stress relief", "Better memory", "Emotional balance"],
          videoUrl: "https://www.youtube.com/shorts/VtHw7rq7-Y8"
        },
        {
          name: "Paschimottanasana (Seated Forward Bend)",
          duration: "1-3 minutes",
          difficulty: "Beginner",
          description: "Stretches the spine, helps relieve stress, and relaxes the mind.",
          benefits: ["Spine flexibility", "Mental relaxation", "Stress reduction"],
          videoUrl: "https://www.youtube.com/shorts/y1ErNTzt5F8"
        },
        {
          name: "Halasana (Plow Pose)",
          duration: "1-5 minutes",
          difficulty: "Intermediate",
          description: "Improves blood flow to the brain, stretches the back and neck, reduces stress and fatigue.",
          benefits: ["Improved blood flow", "Stress reduction", "Neck and back stretch"],
          videoUrl: "https://www.youtube.com/shorts/v8uHhsZ_Dx8"
        },
        {
          name: "Setu Bandhasana (Bridge Pose)",
          duration: "1-3 minutes",
          difficulty: "Beginner",
          description: "Strengthens and stretches the neck and spine, calms the brain, reduces anxiety, stress, and depression.",
          benefits: ["Spine and neck strength", "Anxiety reduction", "Stress relief"],
          videoUrl: "https://www.youtube.com/shorts/quKKO1fT27E"
        },
        {
          name: "Sarvangasana (Shoulder Stand)",
          duration: "3-5 minutes",
          difficulty: "Intermediate",
          description: "Regulates thyroid and parathyroid glands, nourishes the brain, and improves cognitive functions.",
          benefits: ["Thyroid regulation", "Brain nourishment", "Cognitive improvement"],
          videoUrl: "https://www.youtube.com/shorts/GqKh-KyUoug"
        },
      ]
    },
    {
      name: "Back Pain Relief",
      coverImage: "/back-pain.jpg",
      description: "Gentle poses to alleviate back pain and improve posture",
      exercises: [
        {
          name: "Lengthening the Spine",
          duration: "30 seconds",
          difficulty: "Beginner",
          description: "Lifts arms, interlaces fingers, stretches up, and holds posture.",
          benefits: ["Improved posture", "Spine alignment", "Pain relief"],
          videoUrl: "https://www.youtube.com/shorts/zAmw70ilLPs"
        },
        {
          name: "Twisting the Spine - Ardha Matsyendrasana",
          duration: "30 seconds each side",
          difficulty: "Intermediate",
          description: "Twists to the right and left, holds each position.",
          benefits: ["Spine flexibility", "Pain relief", "Improved mobility"],
          videoUrl: "https://www.youtube.com/shorts/KcF-eZLLKpo"
        },
        {
          name: "Bending the Spine - Uttanasana",
          duration: "30 seconds each direction",
          difficulty: "Beginner",
          description: "Bends to the right and left, stretches forward and backward.",
          benefits: ["Spine flexibility", "Pain relief", "Improved mobility"],
          videoUrl: "https://www.youtube.com/shorts/gyFQJIiMS2s"
        },
        {
          name: "Bending the Spine Backward - Chakrasana",
          duration: "30 seconds each direction",
          difficulty: "Advanced",
          description: "Stretch your back starting your movement backward.",
          benefits: ["Spine flexibility", "Pain relief", "Improved mobility", "Strengthen back muscles"],
          videoUrl: "https://www.youtube.com/shorts/C5clWWOm-Yc"
        },
        {
          name: "Garland Pose",
          duration:"1-2 minutes",
          difficulty:"Beginner",
          description: "offers numerous benefits, including improved hip mobility, strengthened lower body, enhanced digestion, and reduced lower back tension. It's particularly beneficial for those who sit for long periods",
          benefits: ["hip mobility, easy labour, strengthened lower body"],
          videoUrl: "https://www.youtube.com/shorts/kWfkAnvp4LA"

       }
      ]
    },
    {
      name: "Boosting Metabolism",
      coverImage: "/metabolism-icon.jpg",
      description: "Poses to enhance metabolic rate and improve digestion",
      exercises: [
        {
          name: "Kapal Bhati Pranayama - Sit pose",
          duration: "5-10 minutes",
          difficulty: "Beginner",
          description: "Boosts metabolic rate, stimulates abdominal organs, improves digestion, and trims the belly.",
          benefits: ["Improved metabolism", "Better digestion", "Belly trimming"],
          videoUrl: "https://www.youtube.com/shorts/qfJ-_DaIRhc"
        },
        {
          name: "Eka Pada RajaKapotasana - Pigeon Pose",
          duration: "30-60 seconds each side",
          difficulty: "Intermediate",
          description: "Stimulates abdominal organs, enhances digestion, improves blood circulation.",
          benefits: ["Improved digestion", "Better blood circulation", "Abdominal stimulation"],
          videoUrl: "https://www.youtube.com/shorts/DZD6bWKZybM"
        },
        {
          name: "Utkatasana - Chair Pose",
          duration: "30-60 seconds",
          difficulty: "Beginner",
          description: "Tones thighs, knees, and legs, improves body posture.",
          benefits: ["Toned legs", "Improved posture", "Thigh and knee strength"],
          videoUrl: "https://www.youtube.com/shorts/-agMz0HFh50"
        },
        {
          name: "Ustrasana - Camel Pose",
          duration: "30-60 seconds",
          difficulty: "Intermediate",
          description: "Enhances digestion, strengthens the lower back, and tones abdominal organs.",
          benefits: ["Improved digestion", "Lower back strength", "Abdominal toning"],
          videoUrl: "https://www.youtube.com/shorts/SMnhJo-glrk"
        },
      ]
    },
    {
      name: "Fertility",
      coverImage: "/fertility-icon.jpg",
      description: "Poses to enhance fertility and reproductive health",
      exercises: [
        {
          name: "Nadi Shodhan Pranayama (Alternate Nostril Breathing)",
          duration: "5-10 minutes",
          difficulty: "Beginner",
          description: "Calms the mind and body, purifies energy channels.",
          benefits: ["Mind and body calmness", "Energy purification", "Stress relief"],
          videoUrl: "https://www.youtube.com/shorts/ZPyHK6BEWyw"
        },
        {
          name: "Bhramari Pranayama (Bee Breath)",
          duration: "5-10 minutes",
          difficulty: "Beginner",
          description: "Relieves tension, anger, and anxiety.",
          benefits: ["Tension relief", "Anxiety reduction", "Emotional balance"],
          videoUrl: "https://www.youtube.com/shorts/VtHw7rq7-Y8"
        },
        {
          name: "Hastapadasana (Standing Forward Bend)",
          duration: "1-3 minutes",
          difficulty: "Beginner",
          description: "Stretches muscles, improves blood supply to the pelvic region.",
          benefits: ["Muscle stretch", "Improved blood supply", "Pelvic health"],
          videoUrl: "https://www.youtube.com/shorts/JCJpzHzcycY"
        },
        {
          name: "Janu Shirasana (One-legged Forward Bend)",
          duration: "1-3 minutes each side",
          difficulty: "Intermediate",
          description: "Strengthens back muscles.",
          benefits: ["Back muscle strength", "Flexibility", "Spine health"],
          videoUrl: "https://www.youtube.com/shorts/lmCkl-px0wI"
        },
        {
          name: "Badhakonasana (Butterfly Pose)",
          duration: "1-3 minutes",
          difficulty: "Beginner",
          description: "Stretches inner thighs and groins, ensures smooth delivery.",
          benefits: ["Inner thigh stretch", "Groin stretch", "Smooth delivery"],
          videoUrl: "https://www.youtube.com/shorts/6ogUT-9njn0"
        },
        {
          name: "Viparita Karani (Legs Up the Wall Pose)",
          duration: "5-10 minutes",
          difficulty: "Beginner",
          description: "Relieves tired legs, backache, improves blood flow to the pelvic region.",
          benefits: ["Leg relief", "Backache relief", "Improved blood flow"],
          videoUrl: "https://www.youtube.com/shorts/E2TpcZxlfKg"
        },
        {
          name: "Yoga Nidra (Yogic Sleep)",
          duration: "15-30 minutes",
          difficulty: "Beginner",
          description: "Attains equilibrium, reduces stress, prepares mind and body for conception.",
          benefits: ["Equilibrium", "Stress reduction", "Conception preparation"],
          videoUrl: "https://www.youtube.com/shorts/qVCFHA_khOo"
        },
      ]
    },
    {
      name: "Arthritis Relief",
      coverImage: "/Arthritis-icon.jpg",
      description: "Poses to alleviate arthritis pain and improve joint health",
      exercises: [
        {
          name: "Veerbhadrasana (Warrior Pose)",
          duration: "30-60 seconds each side",
          difficulty: "Intermediate",
          description: "Strengthens arms, legs, and lower back, beneficial for frozen shoulders.",
          benefits: ["Arm and leg strength", "Lower back strength", "Shoulder health"],
          videoUrl: "https://www.youtube.com/shorts/vxvLxyahNOA"
        },
        {
          name: "Vrikshasana (Tree Pose)",
          duration: "30-60 seconds each side",
          difficulty: "Beginner",
          description: "Strengthens legs and back, improves balance.",
          benefits: ["Leg and back strength", "Improved balance", "Joint health"],
          videoUrl: "https://www.youtube.com/shorts/PZ1zAvcKzrg"
        },
        {
          name: "Marjariasana (Cat Stretch)",
          duration: "1-3 minutes",
          difficulty: "Beginner",
          description: "Brings flexibility, strength to the spine, wrists, and shoulders.",
          benefits: ["Spine flexibility", "Wrist and shoulder strength", "Joint health"],
          videoUrl: "https://www.youtube.com/shorts/qGWHG4Qh-iY"
        },
        {
          name: "Trikonasana (Triangle Pose)",
          duration: "30-60 seconds each side",
          difficulty: "Intermediate",
          description: "Effective for back pain and sciatica, stretches and strengthens the spine.",
          benefits: ["Back pain relief", "Sciatica relief", "Spine strength"],
          videoUrl: "https://www.youtube.com/shorts/thybVfw4ZBs"
        },
        {
          name: "Shavasana (Corpse Pose)",
          duration: "5-10 minutes",
          difficulty: "Beginner",
          description: "Complete relaxation, repairs tissues and cells, releases stress.",
          benefits: ["Complete relaxation", "Stress relief", "Cell repair"],
          videoUrl: "https://www.youtube.com/shorts/qVCFHA_khOo"
        },
      ]
    },
    {
      name: "Shoulder Pain",
      coverImage: "/shoulder-icon.jpg",
      description: "Poses to alleviate shoulder pain and improve shoulder health",
      exercises: [
        {
          name: "Garudasana (Eagle Pose)",
          duration: "30-60 seconds each side",
          difficulty: "Intermediate",
          description: "Stretches shoulders and upper back.",
          benefits: ["Shoulder stretch", "Upper back stretch", "Joint health"],
          videoUrl: "https://www.youtube.com/shorts/aWvptd97bP8"
        },
        {
          name: "Paschim Namaskarasana (Reverse Prayer Pose)",
          duration: "30-60 seconds",
          difficulty: "Intermediate",
          description: "Stretches shoulder joints and pectoral muscles.",
          benefits: ["Shoulder joint stretch", "Pectoral muscle stretch", "Joint health"],
          videoUrl: "https://www.youtube.com/shorts/sPkNAJVJE98"
        },
        {
          name: "Dhanurasana (Bow Pose)",
          duration: "30-60 seconds",
          difficulty: "Intermediate",
          description: "Opens the chest, neck, and shoulders, reduces stress and fatigue.",
          benefits: ["Chest and shoulder opening", "Stress reduction", "Fatigue relief"],
          videoUrl: "https://www.youtube.com/shorts/fCrzSLEBi3U"
        },
        {
          name: "Purvottanasana (Reverse Plank Pose)",
          duration: "30-60 seconds",
          difficulty: "Intermediate",
          description: "Stretches shoulders, chest, and neck, strengthens shoulders and back.",
          benefits: ["Shoulder and chest stretch", "Back strength", "Joint health"],
          videoUrl: "https://www.youtube.com/shorts/hS_KCFjbWKQ"
        },
      ]
    },
    {
      name: "Pregnancy Yoga",
      coverImage: "/preganancy-icon.jpg",
      description: "Safe and gentle poses for pregnant women to improve comfort and prepare for childbirth",
      exercises: [
        {
          name: "Modified Butterfly Pose (Baddha Konasana)",
          duration: "3-5 minutes",
          difficulty: "Beginner",
          description: "Opens the pelvis and prepares the body for childbirth with gentle stretching.",
          benefits: ["Pelvis opening", "Hip flexibility", "Reduced back pain", "Prepares for childbirth"],
          videoUrl: "https://www.youtube.com/shorts/6ogUT-9njn0"
        },
        {
          name: "Cat-Cow Stretch (Marjaryasana-Bitilasana)",
          duration: "2-3 minutes",
          difficulty: "Beginner",
          description: "Gently stretches the back and abdomen, relieving back pain common during pregnancy.",
          benefits: ["Back relief", "Core strength", "Improves posture", "Relieves tension"],
          videoUrl: "https://www.youtube.com/shorts/qGWHG4Qh-iY"
        },
        {
          name: "Modified Pigeon Pose",
          duration: "1-2 minutes per side",
          difficulty: "Intermediate",
          description: "Opens hips and relieves sciatic pain with modifications for pregnancy safety.",
          benefits: ["Hip opener", "Sciatic pain relief", "Pelvic flexibility"],
          videoUrl: "https://www.youtube.com/shorts/DZD6bWKZybM"
        },
        {
          name: "Gentle Forward Bend (Modified Uttanasana)",
          duration: "30-60 seconds",
          difficulty: "Beginner",
          description: "A modified standing forward bend that safely stretches the back during pregnancy.",
          benefits: ["Back stretch", "Hamstring stretch", "Calming effect"],
          videoUrl: "https://www.youtube.com/shorts/gyFQJIiMS2s"
        },
        {
          name: "Supported Shavasana",
          duration: "5-10 minutes",
          difficulty: "Beginner",
          description: "Relaxation pose using pillows to support the body during pregnancy.",
          benefits: ["Deep relaxation", "Stress reduction", "Better sleep", "Reduces swelling"],
          videoUrl: "https://www.youtube.com/shorts/qVCFHA_khOo"
        },
        {
           name: "Garland Pose",
           duration:"1-2 minutes",
           difficulty:"Beginner",
           description: "offers numerous benefits, including improved hip mobility, strengthened lower body, enhanced digestion, and reduced lower back tension. It's particularly beneficial for those who sit for long periods",
           benefits: ["hip mobility, easy labour, strengthened lower body"],
           videoUrl: "https://www.youtube.com/shorts/kWfkAnvp4LA"

        }
      ]
    }
  ];

  const toggleCategory = (index) => {
    setOpenCategory(openCategory === index ? null : index);
  };

  // Extract YouTube video ID from URL
  const extractYouTubeId = (url) => {
    // Handle YouTube shorts URLs
    const shortsMatch = url.match(/youtube\.com\/shorts\/([^?&]+)/);
    if (shortsMatch && shortsMatch[1]) {
      return shortsMatch[1];
    }
    
    // Handle regular YouTube URLs
    const regularMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (regularMatch && regularMatch[1]) {
      return regularMatch[1];
    }
    
    return null;
  };

  // Play video when clicked
  const playVideo = (videoUrl, exerciseName) => {
    const videoId = extractYouTubeId(videoUrl);
    
    if (videoId) {
      setActiveVideos(prev => ({
        ...prev,
        [`${videoUrl}-${exerciseName}`]: true
      }));
    }
  };

  // Get YouTube thumbnail URL
  const getYouTubeThumbnail = (url) => {
    const videoId = extractYouTubeId(url);
    
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
    return "/api/placeholder/400/320"; // Fallback image
  };

  // Get YouTube embed URL
  const getEmbedUrl = (url) => {
    const videoId = extractYouTubeId(url);
    
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">Yoga for Wellness</h1>
        
        {/* Category Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {yogaCategories.map((category, index) => (
            <div 
              key={`category-${index}`}
              onClick={() => toggleCategory(index)}
              className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="h-40 overflow-hidden relative">
                {/* Using the proper path to the image file in public folder */}
                <img 
                  src={category.coverImage} 
                  alt={category.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-4">
                  <h2 className="text-xl font-bold text-white">
                    {category.name}
                  </h2>
                </div>
              </div>
              <div className="p-4">
                <p className="text-gray-600 text-sm mb-3">{category.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">{category.exercises.length} exercises</span>
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                    View Details
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Expanded Category Content */}
        {yogaCategories.map((category, index) => (
          <div 
            key={`expanded-${index}`}
            className={`bg-white rounded-lg shadow-md overflow-hidden mb-6 transition-all duration-300 ${
              openCategory === index ? 'opacity-100' : 'hidden'
            }`}
          >
            <div className="p-6 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">{category.name}</h2>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCategory(null);
                  }} 
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-gray-600 mt-2">{category.description}</p>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {category.exercises.map((exercise, exIndex) => (
                  <div 
                    key={`exercise-${exIndex}`}
                    className="bg-gray-50 rounded-lg overflow-hidden border border-gray-100"
                  >
                    <div className="relative h-48">
                      {!activeVideos[`${exercise.videoUrl}-${exercise.name}`] ? (
                        <>
                          <img 
                            src={getYouTubeThumbnail(exercise.videoUrl)} 
                            alt={exercise.name}
                            className="w-full h-full object-cover"
                          />
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              playVideo(exercise.videoUrl, exercise.name);
                            }}
                            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
                          >
                            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                              <Play className="w-5 h-5 text-indigo-700 ml-1" />
                            </div>
                          </button>
                        </>
                      ) : (
                        <iframe 
                          src={getEmbedUrl(exercise.videoUrl)}
                          title={exercise.name}
                          className="absolute inset-0 w-full h-full"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      )}
                    </div>
                    
                    <div className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-medium text-gray-800">{exercise.name}</h3>
                        <button 
                          className={`${likedExercises[exercise.name] ? 'text-pink-600' : 'text-pink-500 hover:text-pink-600'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(exercise.name);
                          }}
                        >
                          <Heart 
                            className="w-4 h-4" 
                            fill={likedExercises[exercise.name] ? "currentColor" : "none"}
                          />
                        </button>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        <div className="flex items-center px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800">
                          <Clock className="w-3 h-3 mr-1" />
                          {exercise.duration}
                        </div>
                        <div className="flex items-center px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-800">
                          <Award className="w-3 h-3 mr-1" />
                          {exercise.difficulty}
                        </div>
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-3">{exercise.description}</p>
                      
                      <div>
                        <h4 className="text-xs font-medium text-gray-700 mb-2">Benefits:</h4>
                        <div className="flex flex-wrap gap-1">
                          {exercise.benefits.map((benefit, i) => (
                            <span 
                              key={`benefit-${i}`}
                              className="px-2 py-1 rounded text-xs bg-green-50 text-green-700"
                            >
                              {benefit}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default YogaExercises;