package com.example.guischool.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

// Eduguinee brand colors
val EduguineeBlue = Color(0xFF1E40AF)      // Primary blue - trust, education
val EduguineeGreen = Color(0xFF059669)       // Success green
val EduguineeOrange = Color(0xFFD97706)      // Warning orange
val EduguineeRed = Color(0xFFDC2626)         // Error red
val EduguineeDarkRed = Color(0xFF991B1B)     // Critical error

// Light color scheme
private val LightColorScheme = lightColorScheme(
    primary = EduguineeBlue,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFDBE4FF),
    onPrimaryContainer = Color(0xFF001849),
    
    secondary = EduguineeGreen,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFB4F2D6),
    onSecondaryContainer = Color(0xFF002114),
    
    tertiary = EduguineeOrange,
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFFFFDDB3),
    onTertiaryContainer = Color(0xFF2B1700),
    
    error = EduguineeRed,
    onError = Color.White,
    errorContainer = Color(0xFFFFDAD6),
    onErrorContainer = Color(0xFF410002),
    
    background = Color(0xFFF8FAFC),
    onBackground = Color(0xFF1A1C1E),
    
    surface = Color.White,
    onSurface = Color(0xFF1A1C1E),
    surfaceVariant = Color(0xFFE1E2EC),
    onSurfaceVariant = Color(0xFF44474F),
    
    outline = Color(0xFF74777F),
    outlineVariant = Color(0xFFC4C6D0),
    
    inverseSurface = Color(0xFF2F3033),
    inverseOnSurface = Color(0xFFF1F0F4),
    inversePrimary = Color(0xFFAAC7FF),
    
    surfaceTint = EduguineeBlue,
)

// Dark color scheme
private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFFAAC7FF),
    onPrimary = Color(0xFF002F64),
    primaryContainer = Color(0xFF00458D),
    onPrimaryContainer = Color(0xFFDBE4FF),
    
    secondary = Color(0xFF7DDB9E),
    onSecondary = Color(0xFF00391E),
    secondaryContainer = Color(0xFF00522C),
    onSecondaryContainer = Color(0xFFB4F2D6),
    
    tertiary = Color(0xFFF5BF5C),
    onTertiary = Color(0xFF3E2E00),
    tertiaryContainer = Color(0xFF594400),
    onTertiaryContainer = Color(0xFFFFDDB3),
    
    error = Color(0xFFFFB4AB),
    onError = Color(0xFF690005),
    errorContainer = Color(0xFF93000A),
    onErrorContainer = Color(0xFFFFDAD6),
    
    background = Color(0xFF1A1C1E),
    onBackground = Color(0xFFE2E2E6),
    
    surface = Color(0xFF1A1C1E),
    onSurface = Color(0xFFE2E2E6),
    surfaceVariant = Color(0xFF44474F),
    onSurfaceVariant = Color(0xFFC4C6D0),
    
    outline = Color(0xFF8E9099),
    outlineVariant = Color(0xFF44474F),
    
    inverseSurface = Color(0xFFE2E2E6),
    inverseOnSurface = Color(0xFF2F3033),
    inversePrimary = EduguineeBlue,
    
    surfaceTint = Color(0xFFAAC7FF),
)

@Composable
fun EduguineeTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.primary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }
    
    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
