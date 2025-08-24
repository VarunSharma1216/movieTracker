import { motion } from 'framer-motion';

// Page transition wrapper
export const PageTransition = ({ children, className = "" }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{
      duration: 0.3,
      ease: [0.4, 0.0, 0.2, 1]
    }}
  >
    {children}
  </motion.div>
);

// Fade in animation
export const FadeIn = ({ children, delay = 0, duration = 0.3, className = "" }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{
      duration,
      delay,
      ease: "easeOut"
    }}
  >
    {children}
  </motion.div>
);

// Slide up animation
export const SlideUp = ({ children, delay = 0, duration = 0.4, className = "" }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{
      duration,
      delay,
      ease: [0.4, 0.0, 0.2, 1]
    }}
  >
    {children}
  </motion.div>
);

// Slide in from left
export const SlideInLeft = ({ children, delay = 0, duration = 0.4, className = "" }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, x: -50 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{
      duration,
      delay,
      ease: [0.4, 0.0, 0.2, 1]
    }}
  >
    {children}
  </motion.div>
);

// Slide in from right
export const SlideInRight = ({ children, delay = 0, duration = 0.4, className = "" }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, x: 50 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{
      duration,
      delay,
      ease: [0.4, 0.0, 0.2, 1]
    }}
  >
    {children}
  </motion.div>
);

// Scale animation
export const ScaleIn = ({ children, delay = 0, duration = 0.3, className = "" }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{
      duration,
      delay,
      ease: [0.4, 0.0, 0.2, 1]
    }}
  >
    {children}
  </motion.div>
);

// Staggered container for grid items
export const StaggerContainer = ({ children, className = "", staggerDelay = 0.1 }) => (
  <motion.div
    className={className}
    initial="hidden"
    animate="visible"
    variants={{
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: staggerDelay,
        },
      },
    }}
  >
    {children}
  </motion.div>
);

// Staggered child item
export const StaggerItem = ({ children, className = "" }) => (
  <motion.div
    className={className}
    variants={{
      hidden: { opacity: 0, y: 20, scale: 0.95 },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          duration: 0.4,
          ease: [0.4, 0.0, 0.2, 1],
        },
      },
    }}
  >
    {children}
  </motion.div>
);

// Hover animation wrapper
export const HoverLift = ({ children, className = "", scale = 1.03, shadow = true }) => (
  <motion.div
    className={className}
    whileHover={{
      scale,
      y: -2,
      boxShadow: shadow ? "0 8px 25px rgba(0, 0, 0, 0.15)" : undefined,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    }}
    whileTap={{ scale: 0.98 }}
  >
    {children}
  </motion.div>
);

// Count up animation for numbers
export const CountUp = ({ children, from = 0, duration = 1, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay }}
  >
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 0.5,
        delay: delay + 0.2
      }}
    >
      {children}
    </motion.span>
  </motion.div>
);

// Typing animation for text
export const TypeWriter = ({ text, delay = 0, speed = 0.05 }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay }}
  >
    {text.split('').map((char, index) => (
      <motion.span
        key={index}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          delay: delay + (index * speed),
          duration: 0.1
        }}
      >
        {char}
      </motion.span>
    ))}
  </motion.div>
);

// Loading skeleton animation
export const SkeletonBox = ({ width = "100%", height = "20px", className = "" }) => (
  <motion.div
    className={className}
    style={{
      width,
      height,
      backgroundColor: '#f0f0f0',
      borderRadius: '4px'
    }}
    animate={{
      backgroundColor: ['#f0f0f0', '#e0e0e0', '#f0f0f0'],
    }}
    transition={{
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }}
  />
);

// Search dropdown animation
export const DropdownMenu = ({ children, isOpen, className = "" }) => (
  <motion.div
    className={className}
    initial={false}
    animate={isOpen ? "open" : "closed"}
    variants={{
      open: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
          duration: 0.2,
          ease: [0.4, 0.0, 0.2, 1]
        }
      },
      closed: {
        opacity: 0,
        scale: 0.95,
        y: -10,
        transition: {
          duration: 0.15,
          ease: [0.4, 0.0, 0.2, 1]
        }
      }
    }}
  >
    {children}
  </motion.div>
);

// Smooth layout animation wrapper
export const LayoutWrapper = ({ children, className = "" }) => (
  <motion.div
    layout
    className={className}
    transition={{
      layout: {
        duration: 0.3,
        ease: [0.4, 0.0, 0.2, 1]
      }
    }}
  >
    {children}
  </motion.div>
);