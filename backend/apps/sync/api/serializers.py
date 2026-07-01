from rest_framework import serializers


class SyncPushItemSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["CREATE", "UPDATE", "DELETE"])
    model_name = serializers.CharField(max_length=100)
    object_id = serializers.CharField(max_length=100)
    payload = serializers.JSONField(required=False, default=dict)
    version = serializers.IntegerField(required=False, default=1)


class SyncPushSerializer(serializers.Serializer):
    items = SyncPushItemSerializer(many=True)
    device_id = serializers.CharField(max_length=255, required=False)


class SyncResultItemSerializer(serializers.Serializer):
    object_id = serializers.CharField()
    model_name = serializers.CharField()
    status = serializers.CharField()
    version = serializers.IntegerField()
    server_data = serializers.JSONField(required=False)


class SyncPullSerializer(serializers.Serializer):
    since = serializers.DateTimeField(required=True)
    model_name = serializers.CharField(max_length=100, required=False)


class SyncStatusSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    pending = serializers.IntegerField()
    processing = serializers.IntegerField()
    synced = serializers.IntegerField()
    failed = serializers.IntegerField()
    by_priority = serializers.DictField()
    conflicts = serializers.IntegerField()
