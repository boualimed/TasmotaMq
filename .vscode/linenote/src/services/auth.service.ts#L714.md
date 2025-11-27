// 🆕 FIX: Immediately delete user's app data (devices, MQTT, AI config)
      console.log('🗑️ Deleting localStorage data for user:', user.id);
      const deletionResult = storageService.deleteUserData(user.id);
      console.log('🗑️ Storage deletion result:', deletionResult);

      // 🆕 FIX: Clear in-memory device state
      deviceService.clearDevices();
      console.log('🗑️ Cleared in-memory device state');

      console.log('🗑️ Storage keys after deletion:', Object.keys(localStorage));
