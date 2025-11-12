// import mongoose from "mongoose";

// /**
//  * Connect to MongoDB using URI from environment variables
//  * @param {object} options - Mongoose connection options
//  * @returns {Promise<void>}
//  */
// export const dbConnect = async (options = {}) => {
//   const mongoUri = process.env.MONGODB_URI;

//   if (!mongoUri) {
//     throw new Error(
//       "❌ MONGODB_URI is not set. Make sure .env contains MONGODB_URI."
//     );
//   }

//   const defaultOptions = {
//     serverSelectionTimeoutMS: 10000,
//     ...options,
//   };

//   try {
//     // Mask password in logs
//     const maskedUri = mongoUri.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:****@");
//     console.log("Attempting MongoDB connection with URI:", maskedUri);

//     await mongoose.connect(mongoUri, defaultOptions);
//     console.log("✅ Connected to MongoDB");

//     // Handle connection events
//     mongoose.connection.on("error", (err) => {
//       console.error("MongoDB connection error:", err);
//     });

//     mongoose.connection.on("disconnected", () => {
//       console.warn("⚠️ MongoDB disconnected");
//     });

//     process.on("SIGINT", async () => {
//       await mongoose.connection.close();
//       console.log("MongoDB connection closed due to app termination");
//       process.exit(0);
//     });
//   } catch (err) {
//     console.error("MongoDB connection error:", err);
//     throw err;
//   }
// };

// /**
//  * Disconnect from MongoDB
//  * @returns {Promise<void>}
//  */
// export const dbDisconnect = async () => {
//   try {
//     await mongoose.connection.close();
//     console.log("MongoDB connection closed");
//   } catch (err) {
//     console.error("Error closing MongoDB connection:", err);
//     throw err;
//   }
// };




import mongoose from "mongoose";

const dbConnect = async () => {
  
  try {
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      throw new Error('MONGO_URI not defined in environment variables');
    }

    // Connection options (useNewUrlParser and useUnifiedTopology are deprecated since Mongoose 6)
    const options = {
      
      bufferCommands: false,  
      maxPoolSize: 10, // Maximum number of connections in the pool
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      family: 4 
    };

    const conn = await mongoose.connect(uri, options);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);

    // Connection event listeners
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to DB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('Mongoose connection closed through app termination');
      process.exit(0);
    });

    return conn;

  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};


export { dbConnect };