package com.example.guischool.ui.screens.messages

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.guischool.data.model.*
// Icônes contour
import androidx.compose.material.icons.rounded.*      // Icônes arrondies
import androidx.compose.material.icons.sharp.*        // Icônes nettes
import androidx.compose.material.icons.twotone.*      // Icônes deux tons
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset

import com.example.guischool.data.model.Priority  // ← Import correct
import com.example.guischool.data.model.SenderType
import com.example.guischool.data.model.Message

/**
 * Messages screen showing communication between parents and school
 * Redesigned with modern Material Design 3 principles
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MessagesScreen(
    messages: List<Message>,
    onBackClick: () -> Unit,
    onSendMessage: (String, String) -> Unit,
    onMessageClick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var showNewMessageDialog by remember { mutableStateOf(false) }
    var selectedMessage by remember { mutableStateOf<Message?>(null) }
    var messageTitle by remember { mutableStateOf("") }
    var messageContent by remember { mutableStateOf("") }
    var selectedTab by remember { mutableStateOf(0) }

    val unreadCount = messages.count { !it.isRead }
    val urgentCount = messages.count { it.priority == Priority.HIGH && !it.isRead }

    // Animation for FAB
    val fabScale by animateFloatAsState(
        targetValue = if (showNewMessageDialog) 0f else 1f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy)
    )

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            "Messages",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                        if (unreadCount > 0) {
                            Text(
                                "$unreadCount non lu${if (unreadCount > 1) "s" else ""}",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.8f)
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(
                            Icons.Default.ArrowBack,
                            contentDescription = "Retour",
                            modifier = Modifier.size(24.dp)
                        )
                    }
                },
                actions = {
                    // Urgent badge
                    if (urgentCount > 0) {
                        BadgedBox(
                            badge = {
                                Badge(
                                    containerColor = MaterialTheme.colorScheme.error
                                ) {
                                    Text("$urgentCount", fontSize = MaterialTheme.typography.labelSmall.fontSize)
                                }
                            }
                        ) {
                            IconButton(onClick = { /* Filter urgent */ }) {
                                Icon(
                                    Icons.Default.NotificationImportant,
                                    contentDescription = "Urgent",
                                    tint = MaterialTheme.colorScheme.error
                                )
                            }
                        }
                    }

                    IconButton(onClick = { showNewMessageDialog = true }) {
                        Icon(
                            Icons.Default.EditNote,
                            contentDescription = "Nouveau message",
                            modifier = Modifier.size(24.dp)
                        )
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    titleContentColor = MaterialTheme.colorScheme.onPrimaryContainer,
                    navigationIconContentColor = MaterialTheme.colorScheme.onPrimaryContainer,
                    actionIconContentColor = MaterialTheme.colorScheme.onPrimaryContainer
                )
            )
        },
        floatingActionButton = {
            AnimatedVisibility(
                visible = !showNewMessageDialog,
                enter = scaleIn(animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy)),
                exit = scaleOut()
            ) {
                FloatingActionButton(
                    onClick = { showNewMessageDialog = true },
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                    shape = RoundedCornerShape(16.dp),
                    elevation = FloatingActionButtonDefaults.elevation(8.dp),
                    modifier = Modifier.scale(fabScale)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Edit,
                            contentDescription = null,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            "Nouveau",
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }
        },
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    icon = { Icon(Icons.Outlined.AllInbox, contentDescription = null) },
                    label = { Text("Tous") },
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 }
                )
                NavigationBarItem(
                    icon = {
                        BadgedBox(badge = { if (unreadCount > 0) Badge() }) {
                            Icon(Icons.Outlined.MarkEmailUnread, contentDescription = null)
                        }
                    },
                    label = { Text("Non lus") },
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 }
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Outlined.Archive, contentDescription = null) },
                    label = { Text("Archives") },
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 }
                )
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(MaterialTheme.colorScheme.background)
        ) {
            if (messages.isEmpty()) {
                EmptyStateMessage()
            } else {
                val filteredMessages = when (selectedTab) {
                    1 -> messages.filter { !it.isRead }
                    2 -> messages.filter { it.isArchived }
                    else -> messages
                }

                LazyColumn(
                    modifier = modifier.fillMaxSize(),
                    contentPadding = PaddingValues(vertical = 8.dp, horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Section header for unread
                    if (unreadCount > 0 && selectedTab == 0) {
                        item {
                            Text(
                                text = "Messages récents",
                                style = MaterialTheme.typography.labelLarge,
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.padding(vertical = 8.dp)
                            )
                        }
                    }

                    items(
                        items = filteredMessages,
                        key = { it.id }
                    ) { message ->
                        AnimatedMessageCard(
                            message = message,
                            onClick = { onMessageClick(message.id) },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    // Bottom spacer for FAB
                    item { Spacer(modifier = Modifier.height(80.dp)) }
                }
            }
        }
    }

    // Dialogs
    if (showNewMessageDialog) {
        ModernNewMessageDialog(
            title = messageTitle,
            content = messageContent,
            onTitleChange = { messageTitle = it },
            onContentChange = { messageContent = it },
            onSend = {
                onSendMessage(messageTitle, messageContent)
                showNewMessageDialog = false
                messageTitle = ""
                messageContent = ""
            },
            onDismiss = {
                showNewMessageDialog = false
                messageTitle = ""
                messageContent = ""
            }
        )
    }

    selectedMessage?.let { message ->
        ModernMessageDetailDialog(
            message = message,
            onDismiss = { selectedMessage = null }
        )
    }
}

@Composable
private fun EmptyStateMessage() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Outlined.MailOutline,
            contentDescription = null,
            modifier = Modifier
                .size(120.dp)
                .background(
                    MaterialTheme.colorScheme.primaryContainer,
                    CircleShape
                )
                .padding(24.dp),
            tint = MaterialTheme.colorScheme.primary
        )

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "Aucun message",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "Les communications de l'école et des enseignants apparaîtront ici",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center
        )

        Spacer(modifier = Modifier.height(24.dp))

        OutlinedButton(
            onClick = { /* Refresh */ },
            shape = RoundedCornerShape(24.dp)
        ) {
            Icon(Icons.Default.Refresh, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Actualiser")
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AnimatedMessageCard(
    message: Message,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val scale by animateFloatAsState(
        targetValue = 1f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessLow)
    )

    val containerColor = when {
        message.priority == Priority.HIGH && !message.isRead -> MaterialTheme.colorScheme.errorContainer
        !message.isRead -> MaterialTheme.colorScheme.primaryContainer
        else -> MaterialTheme.colorScheme.surface
    }

    val contentColor = when {
        message.priority == Priority.HIGH && !message.isRead -> MaterialTheme.colorScheme.onErrorContainer
        !message.isRead -> MaterialTheme.colorScheme.onPrimaryContainer
        else -> MaterialTheme.colorScheme.onSurface
    }

    Card(
        onClick = onClick,
        modifier = modifier
            .fillMaxWidth()
            .scale(scale),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = containerColor,
            contentColor = contentColor
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = if (!message.isRead) 4.dp else 1.dp,
            pressedElevation = 8.dp
        ),
        border = if (message.priority == Priority.HIGH) {
            androidx.compose.foundation.BorderStroke(2.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.5f))
        } else null
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Top
            ) {
                // Enhanced Avatar with status indicator
                Box {
                    Surface(
                        modifier = Modifier.size(52.dp),
                        shape = CircleShape,
                        color = getSenderTypeColor(message.senderType).copy(alpha = 0.2f),
                        tonalElevation = 4.dp
                    ) {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = getSenderTypeIcon(message.senderType),
                                contentDescription = null,
                                tint = getSenderTypeColor(message.senderType),
                                modifier = Modifier.size(28.dp)
                            )
                        }
                    }

                    // Priority indicator
                    if (message.priority == Priority.HIGH) {
                        Surface(
                            modifier = Modifier
                                .size(16.dp)
                                .align(Alignment.BottomEnd),
                            shape = CircleShape,
                            color = MaterialTheme.colorScheme.error
                        ) {
                            Icon(
                                Icons.Default.PriorityHigh,
                                contentDescription = "Urgent",
                                modifier = Modifier.padding(2.dp),
                                tint = Color.White
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.width(16.dp))

                Column(modifier = Modifier.weight(1f)) {
                    // Header row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(
                                text = message.senderName,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = if (!message.isRead) FontWeight.Bold else FontWeight.SemiBold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f, fill = false)
                            )

                            // Sender type chip
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = getSenderTypeColor(message.senderType).copy(alpha = 0.1f),
                                contentColor = getSenderTypeColor(message.senderType)
                            ) {
                                Text(
                                    text = when (message.senderType) {
                                        SenderType.SCHOOL -> "École"
                                        SenderType.TEACHER -> "Prof"
                                        SenderType.DIRECTOR -> "Direction"
                                        SenderType.ADMIN -> "Admin"
                                        SenderType.PARENT -> "Parent"
                                    },
                                    style = MaterialTheme.typography.labelSmall,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }

                        // Unread indicator or time
                        if (!message.isRead) {
                            Surface(
                                shape = CircleShape,
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(10.dp)
                            ) { }
                        } else {
                            Text(
                                text = formatTimestamp(message.timestamp),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    // Title
                    Text(
                        text = message.title,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = if (!message.isRead) FontWeight.SemiBold else FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        color = contentColor
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    // Content preview
                    Text(
                        text = message.content,
                        style = MaterialTheme.typography.bodyMedium,
                        color = if (message.isRead) MaterialTheme.colorScheme.onSurfaceVariant else contentColor.copy(alpha = 0.8f),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        lineHeight = MaterialTheme.typography.bodyMedium.lineHeight * 1.2f
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    // Footer with time and attachments
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (!message.isRead) {
                            Text(
                                text = formatTimestamp(message.timestamp),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.Medium
                            )
                        }

                        // Attachment indicator
                        if (message.hasAttachments) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(
                                    Icons.Default.Attachment,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp),
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Text(
                                    text = "${message.attachmentCount} pièce${if (message.attachmentCount > 1) "s" else ""} jointe${if (message.attachmentCount > 1) "s" else ""}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ModernNewMessageDialog(
    title: String,
    content: String,
    onTitleChange: (String) -> Unit,
    onContentChange: (String) -> Unit,
    onSend: () -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        modifier = Modifier.fillMaxWidth(0.95f),
        shape = RoundedCornerShape(28.dp),
        containerColor = MaterialTheme.colorScheme.surface,
        tonalElevation = 6.dp,
        title = {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Surface(
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.primaryContainer,
                    modifier = Modifier.size(40.dp)
                ) {
                    Icon(
                        Icons.Default.EditNote,
                        contentDescription = null,
                        modifier = Modifier.padding(8.dp),
                        tint = MaterialTheme.colorScheme.primary
                    )
                }
                Column {
                    Text(
                        "Nouveau message",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        "À la direction",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        },
        text = {
            Column(modifier = Modifier.fillMaxWidth()) {
                // Recipient chip
                AssistChip(
                    onClick = { },
                    label = { Text("Direction de l'école") },
                    leadingIcon = {
                        Icon(
                            Icons.Default.School,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                    },
                    colors = AssistChipDefaults.assistChipColors(
                        containerColor = MaterialTheme.colorScheme.secondaryContainer
                    )
                )

                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = title,
                    onValueChange = onTitleChange,
                    label = { Text("Sujet") },
                    placeholder = { Text("Objet de votre message...") },
                    leadingIcon = {
                        Icon(Icons.Default.Subject, contentDescription = null)
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = MaterialTheme.colorScheme.surface,
                        unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                    )
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = content,
                    onValueChange = onContentChange,
                    label = { Text("Message") },
                    placeholder = { Text("Écrivez votre message ici...") },
                    leadingIcon = {
                        Icon(Icons.Default.Message, contentDescription = null)
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 120.dp),
                    shape = RoundedCornerShape(16.dp),
                    minLines = 4,
                    maxLines = 8,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = MaterialTheme.colorScheme.surface,
                        unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                    )
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Quick actions
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    AssistChip(
                        onClick = { },
                        label = { Text("Joindre") },
                        leadingIcon = { Icon(Icons.Default.Attachment, contentDescription = null, modifier = Modifier.size(18.dp)) }
                    )
                    AssistChip(
                        onClick = { },
                        label = { Text("Photo") },
                        leadingIcon = { Icon(Icons.Default.PhotoCamera, contentDescription = null, modifier = Modifier.size(18.dp)) }
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onSend,
                enabled = title.isNotBlank() && content.isNotBlank(),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary
                ),
                elevation = ButtonDefaults.buttonElevation(4.dp)
            ) {
                Icon(Icons.Default.Send, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Envoyer", fontWeight = FontWeight.SemiBold)
            }
        },
        dismissButton = {
            TextButton(
                onClick = onDismiss,
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Annuler")
            }
        }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ModernMessageDetailDialog(
    message: Message,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        modifier = Modifier.fillMaxWidth(0.95f),
        shape = RoundedCornerShape(28.dp),
        containerColor = MaterialTheme.colorScheme.surface,
        tonalElevation = 6.dp,
        icon = {
            Surface(
                shape = CircleShape,
                color = getSenderTypeColor(message.senderType).copy(alpha = 0.2f),
                modifier = Modifier.size(56.dp)
            ) {
                Icon(
                    getSenderTypeIcon(message.senderType),
                    contentDescription = null,
                    modifier = Modifier
                        .padding(12.dp)
                        .size(32.dp),
                    tint = getSenderTypeColor(message.senderType)
                )
            }
        },
        title = {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    message.senderName,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    when (message.senderType) {
                        SenderType.SCHOOL -> "École"
                        SenderType.TEACHER -> "Enseignant"
                        SenderType.DIRECTOR -> "Direction"
                        SenderType.ADMIN -> "Administration"
                        SenderType.PARENT -> "Parent"
                    },
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(androidx.compose.foundation.rememberScrollState())
            ) {
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = message.title,
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )

                        Spacer(modifier = Modifier.height(4.dp))

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                Icons.Default.Schedule,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = formatTimestamp(message.timestamp),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = message.content,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                    lineHeight = MaterialTheme.typography.bodyLarge.lineHeight * 1.4f
                )

                // Attachments section
                if (message.hasAttachments) {
                    Spacer(modifier = Modifier.height(24.dp))

                    Text(
                        "Pièces jointes",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.primary
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    repeat(message.attachmentCount) { index ->
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Icon(
                                    Icons.Default.InsertDriveFile,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary
                                )
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        "Document_${index + 1}.pdf",
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.Medium
                                    )
                                    Text(
                                        "2.4 MB",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                IconButton(onClick = { }) {
                                    Icon(Icons.Default.Download, contentDescription = "Télécharger")
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onDismiss,
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Fermer")
            }
        },
        dismissButton = {
            TextButton(onClick = { /* Reply action */ }) {
                Icon(Icons.Default.Reply, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("Répondre")
            }
        }
    )
}

// Enhanced helper functions
private fun formatTimestamp(timestamp: String): String {
    // Enhanced date formatting
    return try {
        timestamp.replace("T", " ").substring(0, 16)
    } catch (e: Exception) {
        timestamp
    }
}

private fun getSenderTypeIcon(senderType: SenderType): androidx.compose.ui.graphics.vector.ImageVector {
    return when (senderType) {
        SenderType.SCHOOL -> Icons.Default.School
        SenderType.TEACHER -> Icons.Default.Person
        SenderType.DIRECTOR -> Icons.Default.AdminPanelSettings
        SenderType.ADMIN -> Icons.Default.Settings
        SenderType.PARENT -> Icons.Default.FamilyRestroom
    }
}

private fun getSenderTypeColor(senderType: SenderType): Color {
    return when (senderType) {
        SenderType.SCHOOL -> Color(0xFF1565C0)      // Deep Blue
        SenderType.TEACHER -> Color(0xFF2E7D32)     // Green
        SenderType.DIRECTOR -> Color(0xFFE65100)    // Orange
        SenderType.ADMIN -> Color(0xFF6A1B9A)       // Purple
        SenderType.PARENT -> Color(0xFF00695C)      // Teal
    }
}

// Extension properties for Message model (add to your data class)
val Message.hasAttachments: Boolean get() = attachmentCount > 0
val Message.isArchived: Boolean get() = false // Add to your data model
enum class Priority { LOW, MEDIUM, HIGH } // Add to your data model