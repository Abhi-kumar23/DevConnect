export const DEFAULT_AVATAR_URL = '/default-avatar.svg'

export const getAvatarUrl = (user) => user?.profilePicture || user?.avatar || DEFAULT_AVATAR_URL
